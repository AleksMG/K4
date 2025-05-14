class CipherEngine {
    static VERSION = "7.1";
    static DEFAULT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    static MIN_KEY_LENGTH = 2;
    static MAX_KEY_LENGTH = 30;
    static WORKER_TIMEOUT = 30000;
    static frequencyChart = null;
    static worker = null;
    static analysisTimeout = null;
    static CommonWords = ['THE', 'AND', 'THAT', 'HAVE', 'WITH', 'THIS', 'YOUR']; // Полный список в dictionary.js

    // Инициализация
    static init() {
        this.registerEventListeners();
        this.initProgressBar();
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

    static initProgressBar() {
        const progressHTML = `
            <div id="progressContainer" style="margin:15px 0;padding:10px;background:#f8f9fa;border-radius:8px;display:none;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <span id="progressMessage" style="font-weight:500;">Initializing...</span>
                    <span id="progressPercent" style="color:#6c757d;">0%</span>
                </div>
                <div style="height:10px;background:#e9ecef;border-radius:5px;overflow:hidden;">
                    <div id="progressBar" style="width:0%;height:100%;background:#3498db;transition:width 0.3s ease;"></div>
                </div>
            </div>
        `;
        document.querySelector('.container').insertAdjacentHTML('beforeend', progressHTML);
    }

    static validateAlphabet() {
        const alphabet = document.getElementById('alphabet').value.toUpperCase();
        const uniqueChars = [...new Set(alphabet)];
        
        if (uniqueChars.length !== alphabet.length) {
            throw new Error("Alphabet contains duplicate characters");
        }
        
        if (alphabet.length < 10) {
            throw new Error("Alphabet too short (min 10 characters)");
        }
        
        return alphabet;
    }

    static showStatus(message, type = 'info') {
        const statusEl = document.getElementById('status');
        statusEl.style.display = 'block';
        statusEl.textContent = message;
        statusEl.className = type;
        statusEl.style.background = this.getStatusColor(type);
        console[type === 'error' ? 'error' : 'log'](message);
    }

    static getStatusColor(type) {
        const colors = {
            info: '#eaf2f8',
            success: '#dff0d8',
            warning: '#fff3cd',
            error: '#f8d7da'
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
            const targetWords = knownText.toUpperCase()
                .split(/[\s,\n]+/)
                .filter(w => w.length > 0)
                .map(w => w.replace(new RegExp(`[^${alphabet}]`, 'g'), ''));
            
            if (targetWords.length === 0) throw new Error("No valid words found");
            
            const possibleKeys = this.findKeyCandidates(ciphertext, targetWords, alphabet);
            const validKeys = this.validateKeys(ciphertext, possibleKeys, targetWords, alphabet);
            
            if (validKeys.length === 0) throw new Error("No valid keys found");
            
            const bestKey = this.selectBestKey(validKeys);
            document.getElementById('key').value = bestKey;
            this.decrypt();
            this.showStatus(`Best key: ${bestKey}`, "success");

        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }

    static findKeyCandidates(ciphertext, targetWords, alphabet) {
        const candidates = new Set();
        const cipherUpper = ciphertext.toUpperCase();
        
        targetWords.forEach(word => {
            const wordLen = word.length;
            for (let offset = 0; offset <= cipherUpper.length - wordLen; offset++) {
                const cipherPart = cipherUpper.substr(offset, wordLen);
                const key = this.calculateKeySegment(cipherPart, word, alphabet);
                if (key) candidates.add(key);
            }
        });
        
        return Array.from(candidates);
    }

    static calculateKeySegment(cipherPart, knownPart, alphabet) {
        let key = '';
        for (let i = 0; i < knownPart.length; i++) {
            const cPos = alphabet.indexOf(cipherPart[i]);
            const kPos = alphabet.indexOf(knownPart[i]);
            if (cPos === -1 || kPos === -1) return null;
            key += alphabet[(cPos - kPos + alphabet.length) % alphabet.length];
        }
        return key;
    }

    static validateKeys(ciphertext, keys, targetWords, alphabet) {
        return keys.filter(key => {
            const fullKey = this.generateFullKey(key, ciphertext.length);
            const decrypted = this.processText(ciphertext, fullKey, 'decrypt');
            return targetWords.every(w => decrypted.includes(w)) && 
                   this.isMeaningful(decrypted);
        });
    }

    static isMeaningful(text) {
        const words = text.split(/[\s\W]+/).filter(w => w.length > 2);
        return words.some(w => this.CommonWords.includes(w.toUpperCase()));
    }

    static selectBestKey(keys) {
        return keys.sort((a, b) => {
            const aPattern = this.findRepeatingPattern(a);
            const bPattern = this.findRepeatingPattern(b);
            return aPattern.length - bPattern.length;
        })[0];
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
            
            this.showProgress("Starting analysis...", 5);
            document.getElementById('cancelBtn').style.display = 'inline-block';
            
            this.worker = new Worker('worker.js');
            this.worker.onmessage = (e) => {
                if (e.data.type === 'PROGRESS') {
                    this.showProgress(e.data.message, e.data.percent);
                } else if (e.data.type === 'RESULT') {
                    this.handleAnalysisResult(e.data);
                    this.showProgress("Analysis complete", 100);
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
            this.showProgress("Analysis failed", 100);
        }
    }

    static showProgress(message, percent) {
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const progressMessage = document.getElementById('progressMessage');
        const progressPercent = document.getElementById('progressPercent');
        
        progressContainer.style.display = 'block';
        progressMessage.textContent = message;
        progressPercent.textContent = `${percent}%`;
        progressBar.style.width = `${percent}%`;
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
        this.showProgress("Analysis cancelled", 100);
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
