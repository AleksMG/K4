class CipherEngine {
    static VERSION = "5.2";
    static DEFAULT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    static MIN_KEY_LENGTH = 2;
    static MAX_KEY_LENGTH = 30;
    static WORKER_TIMEOUT = 30000;
    static frequencyChart = null;
    static worker = null;
    static analysisTimeout = null;

    // ================== ИНИЦИАЛИЗАЦИЯ ==================
    static init() {
        this.registerEventListeners();
        console.log(`Vigenère Cipher Expert v${this.VERSION} initialized`);
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

    // ================== ОСНОВНЫЕ МЕТОДЫ ==================
    static validateAlphabet() {
        const alphabet = document.getElementById('alphabet').value.toUpperCase();
        const uniqueChars = [...new Set(alphabet)];
        
        if (uniqueChars.length !== alphabet.length) throw new Error("Алфавит содержит повторяющиеся символы");
        if (alphabet.length < 10) throw new Error("Алфавит слишком короткий (минимум 10 символов)");
        
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
        return {
            info: '#eaf2f8',
            success: '#dff0d8',
            warning: '#fcf8e3',
            error: '#f2dede'
        }[type] || '#eaf2f8';
    }

    static processText(text, key, mode) {
        const alphabet = this.validateAlphabet();
        const cleanText = text.toUpperCase().replace(new RegExp(`[^${alphabet}]`, 'g'), '');
        const cleanKey = key.toUpperCase().replace(new RegExp(`[^${alphabet}]`, 'g'), '');
        
        if (!cleanText) throw new Error("Нет текста для обработки");
        if (!cleanKey) throw new Error("Некорректный ключ");

        return cleanText.split('').map((char, idx) => {
            const textPos = alphabet.indexOf(char);
            const keyPos = alphabet.indexOf(cleanKey[idx % cleanKey.length]);
            if (textPos === -1 || keyPos === -1) return '_';
            
            const resultPos = mode === 'encrypt' 
                ? (textPos + keyPos) % alphabet.length 
                : (textPos - keyPos + alphabet.length) % alphabet.length;
            
            return alphabet[resultPos];
        }).join('');
    }

    // ================== ОСНОВНЫЕ ОПЕРАЦИИ ==================
    static encrypt() {
        try {
            const plaintext = document.getElementById('plaintext').value;
            const key = document.getElementById('key').value;
            
            if (!plaintext) throw new Error("Введите исходный текст");
            if (!key) throw new Error("Введите ключ шифрования");
            
            document.getElementById('ciphertext').value = this.processText(plaintext, key, 'encrypt');
            this.showStatus("Текст зашифрован", "success");
        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }

    static decrypt() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            const key = document.getElementById('key').value;
            
            if (!ciphertext) throw new Error("Введите шифртекст");
            if (!key) throw new Error("Введите ключ дешифрования");
            
            document.getElementById('plaintext').value = this.processText(ciphertext, key, 'decrypt');
            this.showStatus("Текст расшифрован", "success");
            this.updateFrequencyChart();
        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }

    // ================== УЛУЧШЕННЫЙ АНАЛИЗ ==================
    static analyze() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            const knownText = document.getElementById('knownPlaintext').value;
            
            if (!ciphertext || !knownText) throw new Error("Заполните оба поля");
            
            const alphabet = this.validateAlphabet();
            const targetWords = this.parseTargetWords(knownText, alphabet);
            const keyHypotheses = this.generateKeyHypotheses(ciphertext, targetWords, alphabet);
            const validKeys = this.validateKeys(ciphertext, targetWords, keyHypotheses, alphabet);
            
            if (validKeys.length === 0) throw new Error("Ключи не найдены");
            
            const bestKey = this.selectOptimalKey(validKeys);
            document.getElementById('key').value = bestKey;
            this.decrypt();
            this.showStatus(`Найден ключ: ${bestKey}`, "success");

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

    static generateKeyHypotheses(ciphertext, targetWords, alphabet) {
        const hypotheses = new Set();
        const cipherUpper = ciphertext.toUpperCase();
        
        // Генерация гипотез для каждого слова
        targetWords.forEach(word => {
            for (let offset = 0; offset <= cipherUpper.length - word.length; offset++) {
                const cipherPart = cipherUpper.substr(offset, word.length);
                const key = this.calculateKeySegment(cipherPart, word, alphabet);
                if (key) hypotheses.add(key);
            }
        });
        
        // Комбинации для нескольких слов
        for (let i = 0; i < targetWords.length - 1; i++) {
            for (let j = i + 1; j < targetWords.length; j++) {
                const combinedKey = this.findCommonKey(targetWords[i], targetWords[j], cipherUpper, alphabet);
                if (combinedKey) hypotheses.add(combinedKey);
            }
        }
        
        return Array.from(hypotheses);
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

    static findCommonKey(word1, word2, ciphertext, alphabet) {
        for (let offset1 = 0; offset1 <= ciphertext.length - word1.length; offset1++) {
            const key1 = this.calculateKeySegment(
                ciphertext.substr(offset1, word1.length),
                word1,
                alphabet
            );
            
            if (!key1) continue;
            
            for (let offset2 = 0; offset2 <= ciphertext.length - word2.length; offset2++) {
                const key2 = this.calculateKeySegment(
                    ciphertext.substr(offset2, word2.length),
                    word2,
                    alphabet
                );
                
                if (key2 && this.isPatternCompatible(key1, key2)) {
                    return this.mergeKeys(key1, key2);
                }
            }
        }
        return null;
    }

    static isPatternCompatible(key1, key2) {
        const minLen = Math.min(key1.length, key2.length);
        return key1.substr(0, minLen) === key2.substr(0, minLen);
    }

    static mergeKeys(key1, key2) {
        return key1.length >= key2.length ? key1 : key2;
    }

    static validateKeys(ciphertext, targetWords, hypotheses, alphabet) {
        return hypotheses.filter(key => {
            try {
                const fullKey = key.repeat(Math.ceil(ciphertext.length / key.length)).substr(0, ciphertext.length);
                const decrypted = this.processText(ciphertext, fullKey, 'decrypt');
                return targetWords.every(word => decrypted.includes(word));
            } catch {
                return false;
            }
        });
    }

    static selectOptimalKey(keys) {
        return keys.sort((a, b) => {
            const patternA = this.findRepeatingPattern(a);
            const patternB = this.findRepeatingPattern(b);
            return patternA.length - patternB.length || a.length - b.length;
        })[0];
    }

    static findRepeatingPattern(key) {
        for (let len = 1; len <= key.length / 2; len++) {
            const pattern = key.substr(0, len);
            let isValid = true;
            for (let i = len; i < key.length; i += len) {
                if (key.substr(i, len) !== pattern) {
                    isValid = false;
                    break;
                }
            }
            if (isValid) return pattern;
        }
        return key;
    }

    // ================== AUTOCRAK ==================
    static autoCrack() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            if (!ciphertext || ciphertext.length < 50) throw new Error("Нужно минимум 50 символов");
            
            this.showStatus("Начало анализа...", "info");
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
                throw new Error("Превышено время анализа");
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
            this.showStatus(`Найден ключ: ${data.key}`, "success");
        } else {
            throw new Error("Ключ не найден");
        }
    }

    static cancelAnalysis() {
        if (this.worker) this.worker.terminate();
        clearTimeout(this.analysisTimeout);
        document.getElementById('cancelBtn').style.display = 'none';
        this.showStatus("Анализ отменен", "warning");
    }

    // ================== ВИЗУАЛИЗАЦИЯ ==================
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
                    label: 'Частота символов',
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
