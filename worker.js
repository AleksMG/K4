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
            
            // Step 1: Kasiski examination
            const keyLength = this.kasiskiExamination(ciphertext);
            self.postMessage({
                type: 'PROGRESS',
                message: `Found probable key length: ${keyLength}`
            });
            
            // Step 2: Frequency analysis
            const key = this.frequencyAnalysis(ciphertext, keyLength, alphabet);
            self.postMessage({
                type: 'PROGRESS',
                message: `Calculated probable key: ${key}`
            });
            
            // Step 3: Dictionary refinement
            const refinedKey = this.dictionaryAttack(ciphertext, key, alphabet);
            
            self.postMessage({
                type: 'RESULT',
                key: refinedKey,
                keyLength: keyLength,
                confidence: this.calculateConfidence(ciphertext, refinedKey, alphabet)
            });
            
        } catch (error) {
            self.postMessage({
                type: 'ERROR',
                message: error.message
            });
        }
    }
    
    kasiskiExamination(text) {
        const seqLength = 3;
        const sequences = new Map();
        const distanceFactors = new Map();
        
        // Find repeating sequences
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
        
        // Fallback to index of coincidence if no sequences found
        if (distanceFactors.size === 0) {
            return this.estimateKeyLengthWithIC(text);
        }
        
        // Return the most common factor
        return [...distanceFactors.entries()]
            .sort((a, b) => b[1] - a[1])[0][0];
    }
    
    estimateKeyLengthWithIC(text) {
        // Simple index of coincidence estimation
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
        let result = '';
        for (let i = start; i < text.length; i += step) {
            result += text[i];
        }
        return result;
    }
    
    calculateIC(sequence) {
        const freq = {};
        let sum = 0;
        
        for (const c of sequence) {
            freq[c] = (freq[c] || 0) + 1;
        }
        
        for (const c in freq) {
            sum += freq[c] * (freq[c] - 1);
        }
        
        const n = sequence.length;
        return n > 1 ? sum / (n * (n - 1)) : 0;
    }
    
    frequencyAnalysis(text, keyLength, alphabet) {
        const alphaLength = alphabet.length;
        const freqTables = Array.from({ length: keyLength }, () => 
            new Array(alphaLength).fill(0));
        
        // Build frequency tables
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const pos = alphabet.indexOf(char);
            if (pos !== -1) {
                const tableIndex = i % keyLength;
                freqTables[tableIndex][pos]++;
            }
        }
        
        // Find most probable shifts using English frequencies
        return freqTables.map(table => {
            const maxFreq = Math.max(...table);
            const shift = table.indexOf(maxFreq);
            
            // Adjust shift based on English 'E' frequency
            const ePos = alphabet.indexOf('E');
            if (ePos >= 0) {
                const adjustedShift = (shift - ePos + alphaLength) % alphaLength;
                return alphabet[adjustedShift];
            }
            
            return alphabet[shift];
        }).join('');
    }
    
    dictionaryAttack(ciphertext, initialKey, alphabet) {
        // Check if key is a common word
        for (const word of CommonWords) {
            if (initialKey.includes(word)) {
                return word;
            }
        }
        
        // Check for common prefixes/suffixes
        const commonPrefixes = ['THE', 'AND', 'FOR'];
        for (const prefix of commonPrefixes) {
            if (initialKey.startsWith(prefix)) {
                return prefix;
            }
        }
        
        return initialKey;
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
        // Simple confidence based on key length and character distribution
        if (!key || key.length === 0) return 0;
        
        // Check if key is a known word
        if (CommonWords.includes(key)) return 0.95;
        
        // Check character frequency in key
        const commonKeyChars = ['A', 'E', 'I', 'O', 'N', 'T'];
        const commonCount = [...key].filter(c => commonKeyChars.includes(c)).length;
        const ratio = commonCount / key.length;
        
        return Math.min(0.85, 0.5 + ratio * 0.5);
    }
    
    terminate() {
        this.terminateRequested = true;
        self.close();
    }
}

new CryptoWorker();
