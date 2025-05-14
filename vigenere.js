class CipherEngine {
    static VERSION = "3.2.0";
    static DEFAULT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    static MIN_KEY_LENGTH = 2;
    static MAX_KEY_LENGTH = 30;
    static WORKER_TIMEOUT = 30000;
    static frequencyChart = null;
    
    static init() {
        this.worker = null;
        this.analysisTimeout = null;
        this.registerEventListeners();
        console.log(`Vigenère Cipher Expert v${this.VERSION} initialized`);
    }
    
    static registerEventListeners() {
        document.getElementById('alphabet').addEventListener('input', () => {
            this.validateAlphabet();
            this.decrypt();
        });
        
        window.addEventListener('error', (e) => {
            this.showStatus(`Runtime error: ${e.message}`, 'error');
        });
    }
    
    static validateAlphabet() {
        const alphabet = document.getElementById('alphabet').value.toUpperCase();
        const uniqueChars = [...new Set(alphabet)];
        
        if (uniqueChars.length !== alphabet.length) {
            throw new Error("Alphabet contains duplicate characters");
        }
        
        if (alphabet.length < 10) {
            throw new Error("Alphabet too short (min 10 characters required)");
        }
        
        return alphabet;
    }
    
    static showStatus(message, type = 'info') {
        const statusEl = document.getElementById('status');
        statusEl.style.display = 'block';
        statusEl.textContent = message;
        statusEl.className = type;
        statusEl.style.backgroundColor = this.getStatusColor(type);
        
        if (type === 'error') {
            console.error(message);
        } else {
            console.log(message);
        }
    }
    
    static getStatusColor(type) {
        const colors = {
            'info': '#eaf2f8',
            'success': '#e8f5e9',
            'warning': '#fff8e1',
            'error': '#ffebee'
        };
        return colors[type] || '#eaf2f8';
    }
    
    static processText(text, key, mode) {
        const alphabet = this.validateAlphabet();
        const cleanText = text.toUpperCase().replace(new RegExp(`[^${alphabet}]`, 'g'), '');
        const cleanKey = key.toUpperCase().replace(new RegExp(`[^${alphabet}]`, 'g'), '');
        
        if (!cleanText) throw new Error("Invalid input text");
        if (!cleanKey) throw new Error("Invalid key - must only contain alphabet characters");
        
        return cleanText.split('').map((char, idx) => {
            const textPos = alphabet.indexOf(char);
            const keyPos = alphabet.indexOf(cleanKey[idx % cleanKey.length]);
            
            if (textPos === -1) return '_';
            if (keyPos === -1) throw new Error(`Invalid key character: ${cleanKey[idx % cleanKey.length]}`);
            
            let resultPos;
            if (mode === 'encrypt') {
                resultPos = (textPos + keyPos) % alphabet.length;
            } else {
                resultPos = (textPos - keyPos + alphabet.length) % alphabet.length;
            }
            
            return alphabet[resultPos];
        }).join('');
    }
    
    static encrypt() {
        try {
            const plaintext = document.getElementById('plaintext').value;
            const key = document.getElementById('key').value;
            
            if (!plaintext) throw new Error("Plaintext is required");
            if (!key) throw new Error("Encryption key is required");
            
            document.getElementById('ciphertext').value = 
                this.processText(plaintext, key, 'encrypt');
            
            this.showStatus("Encryption completed successfully", "success");
        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }
    
    static decrypt() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            const key = document.getElementById('key').value;
            
            if (!ciphertext) throw new Error("Ciphertext is required");
            if (!key) {
                this.showStatus("Warning: No key provided - cannot decrypt", "warning");
                return;
            }
            
            document.getElementById('plaintext').value = 
                this.processText(ciphertext, key, 'decrypt');
            
            this.showStatus("Decryption completed", "success");
            this.updateFrequencyChart();
        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }
    
    static updateFrequencyChart() {
        const plaintext = document.getElementById('plaintext').value;
        if (!plaintext) return;
        
        const alphabet = this.validateAlphabet();
        const freqMap = this.calculateFrequencies(plaintext, alphabet);
        
        const ctx = document.getElementById('frequencyChart').getContext('2d');
        
        if (this.frequencyChart) {
            this.frequencyChart.destroy();
        }
        
        this.frequencyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: alphabet.split(''),
                datasets: [{
                    label: 'Character Frequency',
                    data: alphabet.split('').map(c => freqMap[c] || 0),
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Frequency'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Characters'
                        }
                    }
                }
            }
        });
    }
    
    static calculateFrequencies(text, alphabet) {
        const freqMap = {};
        const cleanText = text.toUpperCase().replace(new RegExp(`[^${alphabet}]`, 'g'), '');
        const total = cleanText.length || 1;
        
        alphabet.split('').forEach(c => freqMap[c] = 0);
        
        for (const c of cleanText) {
            freqMap[c]++;
        }
        
        for (const c in freqMap) {
            freqMap[c] = (freqMap[c] / total * 100).toFixed(2);
        }
        
        return freqMap;
    }
    
    static analyze() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            const knownText = document.getElementById('knownPlaintext').value;
            const alphabet = this.validateAlphabet();
            
            if (!ciphertext || !knownText) {
                throw new Error("Both ciphertext and known plaintext are required");
            }
            
            const key = this.findKeyFromKnownText(ciphertext, knownText, alphabet);
            document.getElementById('key').value = key;
            this.decrypt();
            
            this.showStatus(`Key fragment found: ${key}`, "success");
        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }
    
    static findKeyFromKnownText(ciphertext, knownText, alphabet) {
        const maxLength = Math.min(ciphertext.length, knownText.length);
        let key = '';
        
        for (let i = 0; i < maxLength; i++) {
            const cipherChar = ciphertext[i].toUpperCase();
            const knownChar = knownText[i].toUpperCase();
            
            const cipherPos = alphabet.indexOf(cipherChar);
            const knownPos = alphabet.indexOf(knownChar);
            
            if (cipherPos === -1 || knownPos === -1) {
                key += '?';
                continue;
            }
            
            const keyPos = (cipherPos - knownPos + alphabet.length) % alphabet.length;
            key += alphabet[keyPos];
        }
        
        const validKeyChars = key.replace(/\?/g, '');
        if (validKeyChars.length < 3) {
            throw new Error("Insufficient matching characters to determine key");
        }
        
        return this.refineKeyWithDictionary(key);
    }
    
    static refineKeyWithDictionary(partialKey) {
        // Simple dictionary check for common English words
        const possibleKeys = [];
        const minLength = 3;
        const maxLength = 10;
        
        for (let len = minLength; len <= Math.min(maxLength, partialKey.length); len++) {
            for (let i = 0; i <= partialKey.length - len; i++) {
                const candidate = partialKey.substr(i, len).replace(/\?/g, '');
                if (candidate.length >= minLength) {
                    possibleKeys.push(candidate);
                }
            }
        }
        
        // Check against common words
        for (const key of possibleKeys) {
            if (CommonWords.includes(key)) {
                return key;
            }
        }
        
        return partialKey;
    }
    
    static autoCrack() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            
            if (!ciphertext || ciphertext.length < 50) {
                throw new Error("Minimum 50 characters required for auto analysis");
            }
            
            this.showStatus("Starting advanced cryptanalysis...", "info");
            document.getElementById('cancelBtn').style.display = 'inline-block';
            
            this.worker = new Worker('worker.js');
            
            this.worker.onmessage = (e) => {
                if (e.data.type === 'PROGRESS') {
                    this.showStatus(e.data.message, "info");
                } else if (e.data.type === 'RESULT') {
                    this.handleAnalysisResult(e.data);
                    document.getElementById('cancelBtn').style.display = 'none';
                } else if (e.data.type === 'ERROR') {
                    throw new Error(e.data.message);
                }
            };
            
            this.worker.postMessage({
                type: 'ANALYZE',
                ciphertext: ciphertext,
                alphabet: document.getElementById('alphabet').value
            });
            
            this.analysisTimeout = setTimeout(() => {
                this.cancelAnalysis();
                throw new Error("Analysis timed out after 30 seconds");
            }, this.WORKER_TIMEOUT);
            
        } catch (error) {
            this.showStatus(error.message, "error");
            document.getElementById('cancelBtn').style.display = 'none';
        }
    }
    
    static handleAnalysisResult(data) {
        clearTimeout(this.analysisTimeout);
        
        if (data.key) {
            document.getElementById('key').value = data.key;
            this.decrypt();
            this.showStatus(`Success! Found key: ${data.key}`, "success");
            
            if (data.keyLength) {
                this.showStatus(`Estimated key length: ${data.keyLength}`, "info");
            }
        } else {
            throw new Error("Failed to determine key");
        }
    }
    
    static cancelAnalysis() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        clearTimeout(this.analysisTimeout);
        document.getElementById('cancelBtn').style.display = 'none';
        this.showStatus("Analysis cancelled", "warning");
    }
}

// Initialize the engine when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    CipherEngine.init();
});
