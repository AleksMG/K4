class CipherEngine {
    static VERSION = "6.0";
    static DEFAULT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    static MIN_KEY_LENGTH = 2;
    static MAX_KEY_LENGTH = 30;
    static WORKER_TIMEOUT = 30000;
    static frequencyChart = null;
    static worker = null;
    static analysisTimeout = null;

    // Инициализация
    static init() {
        this.registerEventListeners();
        console.log(`Vigenère Cipher Expert v${this.VERSION} initialized`);
    }

    // Регистрация событий
    static registerEventListeners() {
        document.getElementById('alphabet').addEventListener('input', () => {
            this.validateAlphabet();
            this.decrypt();
        });

        window.addEventListener('error', (e) => {
            this.showStatus(`Runtime Error: ${e.message}`, 'error');
        });
    }

    // Валидация алфавита
    static validateAlphabet() {
        const alphabet = document.getElementById('alphabet').value.toUpperCase();
        const uniqueChars = [...new Set(alphabet)];
        
        if (uniqueChars.length !== alphabet.length) {
            throw new Error("Alphabet contains duplicates");
        }
        
        if (alphabet.length < 10) {
            throw new Error("Alphabet too short (min 10 chars)");
        }
        
        return alphabet;
    }

    // Отображение статуса
    static showStatus(message, type = 'info') {
        const statusEl = document.getElementById('status');
        statusEl.style.display = 'block';
        statusEl.textContent = message;
        statusEl.className = type;
        statusEl.style.background = this.getStatusColor(type);
    }

    static getStatusColor(type) {
        const colors = {
            info: '#eaf2f8',
            success: '#e8f5e9',
            warning: '#fff8e1',
            error: '#ffebee'
        };
        return colors[type] || '#ffffff';
    }

    // Основная обработка текста
    static processText(text, key, mode) {
        const alphabet = this.validateAlphabet();
        const cleanText = text.toUpperCase().replace(new RegExp(`[^${alphabet}]`, 'g'), '');
        const cleanKey = key.toUpperCase().replace(new RegExp(`[^${alphabet}]`, 'g'), '');
        
        if (!cleanText) throw new Error("Invalid input text");
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

    // Шифрование
    static encrypt() {
        try {
            const plaintext = document.getElementById('plaintext').value;
            const key = document.getElementById('key').value;
            
            if (!plaintext) throw new Error("Plaintext required");
            if (!key) throw new Error("Encryption key required");
            
            document.getElementById('ciphertext').value = 
                this.processText(plaintext, key, 'encrypt');
            
            this.showStatus("Encryption successful", "success");
        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }

    // Дешифровка
    static decrypt() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            const key = document.getElementById('key').value;
            
            if (!ciphertext) throw new Error("Ciphertext required");
            if (!key) throw new Error("Decryption key required");
            
            document.getElementById('plaintext').value = 
                this.processText(ciphertext, key, 'decrypt');
            
            this.showStatus("Decryption successful", "success");
            this.updateFrequencyChart();
        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }

    // Анализ известного текста
    static analyze() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            const knownText = document.getElementById('knownPlaintext').value;
            const alphabet = this.validateAlphabet();
            
            if (!ciphertext || !knownText) {
                throw new Error("Both fields required");
            }

            const targetWords = knownText.toUpperCase()
                .split(/[\s,\n]+/)
                .map(w => w.replace(new RegExp(`[^${alphabet}]`, 'g'), ''))
                .filter(w => w.length > 0);

            if (targetWords.length === 0) {
                throw new Error("No valid words found");
            }

            const candidates = this.findKeyCandidates(ciphertext, targetWords, alphabet);
            const validKeys = this.validateKeys(ciphertext, targetWords, candidates, alphabet);
            
            if (validKeys.length === 0) {
                throw new Error("No valid keys found");
            }

            const bestKey = this.selectBestKey(validKeys, alphabet);
            document.getElementById('key').value = bestKey;
            this.decrypt();
            this.showStatus(`Best key: ${bestKey}`, "success");

        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }

    static findKeyCandidates(ciphertext, targetWords, alphabet) {
        const candidates = [];
        const cipherUpper = ciphertext.toUpperCase();
        
        for (const word of targetWords) {
            const wordLen = word.length;
            for (let pos = 0; pos <= cipherUpper.length - wordLen; pos++) {
                const cipherPart = cipherUpper.substr(pos, wordLen);
                const keyPart = this.calcKeyPart(cipherPart, word, alphabet);
                if (keyPart) candidates.push({ key: keyPart, pos, word });
            }
        }
        return candidates;
    }

    static calcKeyPart(cipherPart, knownPart, alphabet) {
        return [...knownPart].map((kChar, i) => {
            const cPos = alphabet.indexOf(cipherPart[i]);
            const kPos = alphabet.indexOf(kChar);
            return cPos !== -1 && kPos !== -1 
                ? alphabet[(cPos - kPos + alphabet.length) % alphabet.length]
                : null;
        }).join('');
    }

    static validateKeys(ciphertext, targetWords, candidates, alphabet) {
        const validKeys = new Set();
        
        for (const {key} of candidates) {
            try {
                const fullKey = key.repeat(Math.ceil(ciphertext.length / key.length)).slice(0, ciphertext.length);
                const decrypted = this.processText(ciphertext, fullKey, 'decrypt');
                
                if (targetWords.every(w => decrypted.includes(w))) {
                    validKeys.add(fullKey);
                }
            } catch (e) {
                console.warn("Invalid key:", key);
            }
        }
        return [...validKeys];
    }

    static selectBestKey(keys, alphabet) {
        return keys.sort((a, b) => {
            const aPat = this.findRepeatingPattern(a);
            const bPat = this.findRepeatingPattern(b);
            return aPat.length - bPat.length || a.length - b.length;
        })[0];
    }

    static findRepeatingPattern(key) {
        for (let len = 1; len <= key.length / 2; len++) {
            const pattern = key.substring(0, len);
            let isValid = true;
            for (let i = len; i < key.length; i += len) {
                if (key.substring(i, i + len) !== pattern) {
                    isValid = false;
                    break;
                }
            }
            if (isValid) return pattern;
        }
        return key;
    }

    // Авто-взлом
    static autoCrack() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            if (!ciphertext || ciphertext.length < 50) throw new Error("Minimum 50 chars required");

            this.showStatus("Starting analysis...", "info");
            document.getElementById('cancelBtn').style.display = 'block';

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
                throw new Error("Analysis timeout");
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
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
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

        if (this.frequencyChart) {
            this.frequencyChart.destroy();
        }

        this.frequencyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [...alphabet],
                datasets: [{
                    label: 'Frequency Distribution',
                    data: [...alphabet].map(c => freqData[c] || 0),
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true },
                    x: { ticks: { autoSkip: false }}
                }
            }
        });
    }

    static calculateFrequencies(text, alphabet) {
        const freqMap = {};
        const cleanText = text.toUpperCase().replace(new RegExp(`[^${alphabet}]`, 'g'), '');
        
        [...alphabet].forEach(c => freqMap[c] = 0);
        [...cleanText].forEach(c => freqMap[c]++);
        
        return freqMap;
    }
}

document.addEventListener('DOMContentLoaded', () => CipherEngine.init());
