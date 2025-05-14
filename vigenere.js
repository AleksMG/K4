class CipherEngine {
    static VERSION = "6.1";
    static DEFAULT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    static MIN_KEY_LENGTH = 2;
    static MAX_KEY_LENGTH = 15;
    static WORKER_TIMEOUT = 60000;
    static frequencyChart = null;
    static worker = null;
    static analysisTimeout = null;
    static ENGLISH_FREQUENCY = {
        'A': 0.08167, 'B': 0.01492, 'C': 0.02782, 'D': 0.04253,
        'E': 0.12702, 'F': 0.02228, 'G': 0.02015, 'H': 0.06094,
        'I': 0.06966, 'J': 0.00153, 'K': 0.00772, 'L': 0.04025,
        'M': 0.02406, 'N': 0.06749, 'O': 0.07507, 'P': 0.01929,
        'Q': 0.00095, 'R': 0.05987, 'S': 0.06327, 'T': 0.09056,
        'U': 0.02758, 'V': 0.00978, 'W': 0.02360, 'X': 0.00150,
        'Y': 0.01974, 'Z': 0.00074
    };
    static COMMON_WORDS = new Set(['THE', 'AND', 'THAT', 'HAVE', 'WITH', 'THIS', 'FOR', 'NOT', 'YOU', 'ARE']);

    static init() {
        this.registerEventListeners();
        console.log(`Vigenère Expert v${this.VERSION} initialized`);
    }

    static registerEventListeners() {
        document.getElementById('alphabet').addEventListener('input', () => {
            try {
                this.validateAlphabet();
                this.decrypt();
            } catch (error) {
                this.showStatus(error.message, 'error');
            }
        });
    }

    static validateAlphabet() {
        const alphabet = document.getElementById('alphabet').value.toUpperCase();
        const uniqueChars = [...new Set(alphabet)];
        
        if (uniqueChars.length !== alphabet.length) throw new Error("Alphabet has duplicates");
        if (alphabet.length < 10) throw new Error("Alphabet too short (min 10 chars)");
        
        return alphabet;
    }

    static showStatus(message, type = 'info') {
        const statusEl = document.getElementById('status');
        statusEl.style.display = 'block';
        statusEl.textContent = message;
        statusEl.className = type;
        statusEl.style.backgroundColor = this.getStatusColor(type);
        console[type === 'error' ? 'error' : 'log'](message);
    }

    static getStatusColor(type) {
        const colors = {
            info: '#eaf2f8',
            success: '#dff0d8',
            warning: '#fcf8e3',
            error: '#f2dede'
        };
        return colors[type] || '#eaf2f8';
    }

    static processText(text, key, mode) {
        const alphabet = this.validateAlphabet();
        const cleanText = text.toUpperCase().replace(new RegExp(`[^${alphabet}]`, 'g'), '');
        const cleanKey = key.toUpperCase().replace(new RegExp(`[^${alphabet}]`, 'g'), '');
        
        if (!cleanText) throw new Error("Input text required");
        if (!cleanKey) throw new Error("Invalid key");

        return [...cleanText].map((char, idx) => {
            const textPos = alphabet.indexOf(char);
            const keyPos = alphabet.indexOf(cleanKey[idx % cleanKey.length]);
            
            if (textPos === -1 || keyPos === -1) return '_';
            
            const resultPos = mode === 'encrypt' 
                ? (textPos + keyPos) % alphabet.length 
                : (textPos - keyPos + alphabet.length) % alphabet.length;
            
            return alphabet[resultPos];
        }).join('');
    }

    static encrypt() {
        try {
            const plaintext = document.getElementById('plaintext').value;
            const key = document.getElementById('key').value;
            
            if (!plaintext) throw new Error("Enter plaintext");
            if (!key) throw new Error("Enter encryption key");
            
            document.getElementById('ciphertext').value = this.processText(plaintext, key, 'encrypt');
            this.showStatus("Encryption successful", "success");
        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }

    static decrypt() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            const key = document.getElementById('key').value;
            
            if (!ciphertext) throw new Error("Enter ciphertext");
            if (!key) throw new Error("Enter decryption key");
            
            document.getElementById('plaintext').value = this.processText(ciphertext, key, 'decrypt');
            this.showStatus("Decryption successful", "success");
            this.updateFrequencyChart();
        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }

    static analyze() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            const knownText = document.getElementById('knownPlaintext').value;
            
            if (!ciphertext || !knownText) throw new Error("Both fields required");
            
            const alphabet = this.validateAlphabet();
            const targetWords = this.parseTargetWords(knownText, alphabet);
            
            const possibleKeys = this.findPossibleKeys(ciphertext, targetWords, alphabet);
            const validKeys = this.validateKeys(ciphertext, possibleKeys, targetWords, alphabet);
            
            if (validKeys.length === 0) throw new Error("No valid keys found");
            
            const bestKey = this.selectBestKey(validKeys, ciphertext, alphabet);
            document.getElementById('key').value = bestKey;
            this.decrypt();
            this.showStatus(`Best key found: ${bestKey}`, "success");

        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }

    static parseTargetWords(text, alphabet) {
        return text.toUpperCase()
            .split(/[\s,\n]+/)
            .map(w => w.replace(new RegExp(`[^${alphabet}]`, 'g'), ''))
            .filter(w => w.length > 0);
    }

    static findPossibleKeys(ciphertext, targetWords, alphabet) {
        const keys = new Set();
        const cipherUpper = ciphertext.toUpperCase();
        
        for (const word of targetWords) {
            for (let offset = 0; offset <= cipherUpper.length - word.length; offset++) {
                const cipherPart = cipherUpper.substr(offset, word.length);
                const key = this.calculateKey(cipherPart, word, alphabet);
                if (key) keys.add(key);
            }
        }
        return Array.from(keys);
    }

    static calculateKey(cipherPart, knownPart, alphabet) {
        let key = '';
        for (let i = 0; i < knownPart.length; i++) {
            const cPos = alphabet.indexOf(cipherPart[i]);
            const kPos = alphabet.indexOf(knownPart[i]);
            if (cPos === -1 || kPos === -1) return null;
            key += alphabet[(cPos - kPos + alphabet.length) % alphabet.length];
        }
        return this.findRepeatingPattern(key);
    }

    static validateKeys(ciphertext, keys, targetWords, alphabet) {
        return keys.filter(key => {
            const fullKey = this.generateFullKey(key, ciphertext.length);
            const decrypted = this.processText(ciphertext, fullKey, 'decrypt');
            return targetWords.every(word => decrypted.includes(word)) &&
                   this.isMeaningful(decrypted);
        });
    }

    static isMeaningful(text) {
        const words = text.split(/[\s\W]+/).filter(w => w.length > 2);
        return words.some(w => this.COMMON_WORDS.has(w.toUpperCase()));
    }

    static selectBestKey(keys, ciphertext, alphabet) {
        return keys.sort((a, b) => {
            const aScore = this.calculateKeyScore(a, ciphertext, alphabet);
            const bScore = this.calculateKeyScore(b, ciphertext, alphabet);
            return bScore - aScore;
        })[0];
    }

    static calculateKeyScore(key, ciphertext, alphabet) {
        const decrypted = this.processText(ciphertext, key, 'decrypt');
        let score = 0;
        
        // Frequency analysis
        const freq = this.calculateFrequencies(decrypted, alphabet);
        for (const char in freq) {
            score += 1 - Math.abs(freq[char] - this.ENGLISH_FREQUENCY[char] || 0);
        }
        
        // Common words
        const commonWordsFound = decrypted.split(/\W+/).filter(w => this.COMMON_WORDS.has(w.toUpperCase())).length;
        score += commonWordsFound * 10;
        
        // Key length
        score += 15 / key.length;
        
        return score;
    }

    static findRepeatingPattern(key) {
        for (let len = 1; len <= key.length / 2; len++) {
            const pattern = key.substr(0, len);
            if (key === pattern.repeat(Math.ceil(key.length / len)).substr(0, key.length)) {
                return pattern;
            }
        }
        return key;
    }

    static generateFullKey(baseKey, requiredLength) {
        return baseKey.repeat(Math.ceil(requiredLength / baseKey.length)).substr(0, requiredLength);
    }

    static autoCrack() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            if (!ciphertext || ciphertext.length < 50) throw new Error("Minimum 50 characters required");
            
            this.showStatus("Starting advanced analysis...", "info");
            document.getElementById('cancelBtn').style.display = 'inline-block';
            
            this.worker = new Worker('worker.js');
            this.worker.onmessage = (e) => {
                if (e.data.type === 'PROGRESS') {
                    this.showStatus(e.data.message, "info");
                } else if (e.data.type === 'RESULT') {
                    this.handleAnalysisResult(e.data);
                    document.getElementById('cancelBtn').style.display = 'none';
                }
            };
            
            this.worker.postMessage({
                type: 'ANALYZE',
                ciphertext: ciphertext,
                alphabet: document.getElementById('alphabet').value
            });
            
            this.analysisTimeout = setTimeout(() => {
                this.cancelAnalysis();
                throw new Error("Analysis timed out");
            }, this.WORKER_TIMEOUT);
            
        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }

    static handleAnalysisResult(data) {
        clearTimeout(this.analysisTimeout);
        if (data.key) {
            document.getElementById('key').value = data.key;
            this.decrypt();
            this.showStatus(`Found key: ${data.key}`, "success");
        } else {
            throw new Error("Key not found");
        }
    }

    static cancelAnalysis() {
        if (this.worker) this.worker.terminate();
        clearTimeout(this.analysisTimeout);
        document.getElementById('cancelBtn').style.display = 'none';
        this.showStatus("Analysis cancelled", "warning");
    }

    static updateFrequencyChart() {
        const plaintext = document.getElementById('plaintext').value;
        if (!plaintext) return;
        
        const alphabet = this.validateAlphabet();
        const ctx = document.getElementById('frequencyChart').getContext('2d');
        const freqData = this.calculateFrequencies(plaintext, alphabet);
        
        if (this.frequencyChart) this.frequencyChart.destroy();
        
        this.frequencyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: alphabet.split(''),
                datasets: [{
                    label: 'Character Frequency',
                    data: alphabet.split('').map(c => freqData[c] || 0),
                    backgroundColor: '#3498db'
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    static calculateFrequencies(text, alphabet) {
        const cleanText = text.toUpperCase().replace(new RegExp(`[^${alphabet}]`, 'g'), '');
        const total = cleanText.length || 1;
        const freqMap = {};
        
        alphabet.split('').forEach(c => freqMap[c] = 0);
        for (const c of cleanText) freqMap[c]++;
        for (const c in freqMap) freqMap[c] = Number((freqMap[c] / total * 100).toFixed(2));
        
        return freqMap;
    }
}

document.addEventListener('DOMContentLoaded', () => CipherEngine.init());
