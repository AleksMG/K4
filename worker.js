// worker.js
class CryptoWorker {
    constructor() {
        this.MIN_KEY_LENGTH = 2;
        this.MAX_KEY_LENGTH = 30;
        this.terminateRequested = false;
        this.initEventListeners();
    }

    initEventListeners() {
        self.addEventListener('message', (e) => {
            if (this.terminateRequested) return;
            
            switch(e.data.type) {
                case 'ANALYZE':
                    this.handleAnalysis(e.data);
                    break;
                case 'TERMINATE':
                    this.terminate();
                    break;
            }
        });
    }

    handleAnalysis(data) {
        try {
            const { ciphertext, alphabet } = data;
            
            if (!ciphertext || ciphertext.length < 50) {
                throw new Error("Insufficient ciphertext length");
            }

            // 1. Kasiski examination
            const keyLength = this.kasiskiExamination(ciphertext);
            self.postMessage({ type: 'PROGRESS', message: `Key length candidate: ${keyLength}` });

            // 2. Frequency analysis
            const key = this.frequencyAnalysis(ciphertext, keyLength, alphabet);
            self.postMessage({ type: 'PROGRESS', message: `Potential key: ${key}` });

            // 3. Dictionary refinement
            const refinedKey = this.refineKey(ciphertext, key, alphabet);
            
            self.postMessage({
                type: 'RESULT',
                key: refinedKey,
                keyLength: keyLength,
                confidence: this.calculateConfidence(ciphertext, refinedKey, alphabet)
            });

        } catch (error) {
            self.postMessage({ type: 'ERROR', message: error.message });
        }
    }

    kasiskiExamination(text) {
        const seqLength = 3;
        const sequences = new Map();
        const distanceFactors = new Map();
        
        for (let i = 0; i < text.length - seqLength; i++) {
            const seq = text.substr(i, seqLength);
            
            if (sequences.has(seq)) {
                const distance = i - sequences.get(seq);
                this.calculateFactors(distance).forEach(factor => {
                    if (factor >= this.MIN_KEY_LENGTH && factor <= this.MAX_KEY_LENGTH) {
                        distanceFactors.set(factor, (distanceFactors.get(factor) || 0) + 1);
                    }
                });
            } else {
                sequences.set(seq, i);
            }
        }
        
        return distanceFactors.size > 0 
            ? [...distanceFactors.entries()].sort((a, b) => b[1] - a[1])[0][0]
            : this.estimateWithCoincidenceIndex(text);
    }

    estimateWithCoincidenceIndex(text) {
        const maxLength = Math.min(20, Math.floor(text.length / 2));
        let bestLength = 3;
        let bestIC = 0;
        
        for (let L = this.MIN_KEY_LENGTH; L <= maxLength; L++) {
            let totalIC = 0;
            for (let i = 0; i < L; i++) {
                const sequence = this.getSequence(text, i, L);
                totalIC += this.calculateIC(sequence);
            }
            const avgIC = totalIC / L;
            if (avgIC > bestIC) {
                bestIC = avgIC;
                bestLength = L;
            }
        }
        return bestLength;
    }

    getSequence(text, start, step) {
        return [...Array(Math.ceil((text.length - start) / step))]
            .map((_, i) => text[start + i * step])
            .join('');
    }

    calculateIC(sequence) {
        const freq = {};
        for (const c of sequence) freq[c] = (freq[c] || 0) + 1;
        
        return Object.values(freq).reduce((acc, count) => 
            acc + count * (count - 1), 0) / (sequence.length * (sequence.length - 1));
    }

    frequencyAnalysis(text, keyLength, alphabet) {
        const freqTables = Array.from({ length: keyLength }, () => 
            new Array(alphabet.length).fill(0));
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const pos = alphabet.indexOf(char);
            if (pos !== -1) {
                const tableIndex = i % keyLength;
                freqTables[tableIndex][pos]++;
            }
        }
        
        return freqTables.map(table => {
            const maxIndex = table.indexOf(Math.max(...table));
            return alphabet[maxIndex];
        }).join('');
    }

    refineKey(ciphertext, initialKey, alphabet) {
        const possibleKeys = [];
        for (let len = 3; len <= initialKey.length; len++) {
            for (let i = 0; i <= initialKey.length - len; i++) {
                const candidate = initialKey.substr(i, len);
                possibleKeys.push(candidate);
            }
        }
        
        return possibleKeys.sort((a, b) => b.length - a.length)[0];
    }

    calculateFactors(number) {
        const factors = new Set();
        for (let i = 2; i <= Math.sqrt(number); i++) {
            if (number % i === 0) {
                factors.add(i);
                factors.add(number / i);
            }
        }
        return [...factors];
    }

    calculateConfidence(ciphertext, key, alphabet) {
        const decrypted = this.processText(ciphertext, key, alphabet);
        const validChars = decrypted.replace(/_/g, '').length;
        return validChars / decrypted.length;
    }

    processText(text, key, alphabet) {
        return [...text].map((char, idx) => {
            const textPos = alphabet.indexOf(char);
            const keyPos = alphabet.indexOf(key[idx % key.length]);
            return textPos !== -1 && keyPos !== -1
                ? alphabet[(textPos - keyPos + alphabet.length) % alphabet.length]
                : '_';
        }).join('');
    }

    terminate() {
        this.terminateRequested = true;
        self.close();
    }
}

new CryptoWorker();
