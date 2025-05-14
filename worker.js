class CipherEngine {
    static VERSION = "5.1";
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
    }

    // Валидация алфавита
    static validateAlphabet() {
        const alphabet = document.getElementById('alphabet').value.toUpperCase();
        const unique = [...new Set(alphabet)];
        
        if (unique.length !== alphabet.length) throw new Error("Алфавит содержит повторяющиеся символы");
        if (alphabet.length < 10) throw new Error("Алфавит слишком короткий (минимум 10 символов)");
        
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

    // Основная обработка текста
    static processText(text, key, mode) {
        const alphabet = this.validateAlphabet();
        const cleanText = text.toUpperCase().replace(new RegExp(`[^${alphabet}]`, 'g'), '');
        const cleanKey = key.toUpperCase().replace(new RegExp(`[^${alphabet}]`, 'g'), '');
        
        return cleanText.split('').map((c, i) => {
            const textPos = alphabet.indexOf(c);
            const keyPos = alphabet.indexOf(cleanKey[i % cleanKey.length]);
            if (textPos === -1 || keyPos === -1) return '_';
            
            const resultPos = mode === 'encrypt' 
                ? (textPos + keyPos) % alphabet.length 
                : (textPos - keyPos + alphabet.length) % alphabet.length;
            
            return alphabet[resultPos];
        }).join('');
    }

    // Анализ известного текста (УЛУЧШЕННАЯ ВЕРСИЯ)
    static analyze() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            const knownText = document.getElementById('knownPlaintext').value;
            const alphabet = this.validateAlphabet();
            
            if (!ciphertext || !knownText) throw new Error("Заполните все поля");
            
            // Парсинг целевых слов
            const targetWords = knownText.toUpperCase()
                .split(/[\s,\n]+/)
                .map(w => w.replace(new RegExp(`[^${alphabet}]`, 'g'), ''))
                .filter(w => w.length > 0);
            
            if (targetWords.length === 0) throw new Error("Не найдено валидных слов");

            // Поиск ключей
            const candidates = this.findKeyCandidates(ciphertext, targetWords, alphabet);
            const validKeys = this.validateKeys(ciphertext, targetWords, candidates, alphabet);
            
            if (validKeys.length === 0) throw new Error("Подходящие ключи не найдены");
            
            const bestKey = this.selectBestKey(validKeys, alphabet);
            document.getElementById('key').value = bestKey;
            this.decrypt();
            this.showStatus(`Найден ключ: ${bestKey}`, "success");
            
        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }

    // Поиск кандидатов ключей
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

    // Расчет части ключа
    static calcKeyPart(cipherPart, knownPart, alphabet) {
        let key = '';
        for (let i = 0; i < knownPart.length; i++) {
            const cPos = alphabet.indexOf(cipherPart[i]);
            const kPos = alphabet.indexOf(knownPart[i]);
            if (cPos === -1 || kPos === -1) return null;
            key += alphabet[(cPos - kPos + alphabet.length) % alphabet.length];
        }
        return key;
    }

    // Валидация ключей
    static validateKeys(ciphertext, targetWords, candidates, alphabet) {
        const validKeys = new Set();
        
        for (const {key} of candidates) {
            try {
                const fullKey = this.generateFullKey(key, ciphertext.length);
                const decrypted = this.processText(ciphertext, fullKey, 'decrypt');
                
                if (targetWords.every(w => decrypted.includes(w))) {
                    validKeys.add(fullKey);
                }
            } catch (e) {
                console.warn("Недопустимый ключ:", key);
            }
        }
        return [...validKeys];
    }

    // Генерация полного ключа
    static generateFullKey(baseKey, requiredLength) {
        return baseKey.repeat(Math.ceil(requiredLength / baseKey.length))
                      .substring(0, requiredLength);
    }

    // Выбор лучшего ключа
    static selectBestKey(keys, alphabet) {
        return keys.sort((a, b) => {
            const aPat = this.findRepeatingPattern(a);
            const bPat = this.findRepeatingPattern(b);
            return aPat.length - bPat.length || a.length - b.length;
        })[0];
    }

    // Поиск повторяющегося паттерна
    static findRepeatingPattern(key) {
        for (let len = 1; len <= key.length / 2; len++) {
            const pattern = key.substring(0, len);
            let valid = true;
            for (let i = len; i < key.length; i += len) {
                if (key.substring(i, i + len) !== pattern) {
                    valid = false;
                    break;
                }
            }
            if (valid) return pattern;
        }
        return key;
    }

    // Авто-взлом (ИСПРАВЛЕННАЯ ВЕРСИЯ)
    static autoCrack() {
        try {
            const ciphertext = document.getElementById('ciphertext').value;
            if (!ciphertext || ciphertext.length < 50) throw new Error("Нужно минимум 50 символов");

            this.showStatus("Начало анализа...", "info");
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
                throw new Error("Таймаут анализа");
            }, this.WORKER_TIMEOUT);

        } catch (error) {
            this.showStatus(error.message, "error");
        }
    }

    // Обработка результатов авто-взлома
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

    // Остальные методы
    static encrypt() { /* ... */ }
    static decrypt() { /* ... */ }
    static cancelAnalysis() { /* ... */ }
    static updateFrequencyChart() { /* ... */ }
}

document.addEventListener('DOMContentLoaded', () => CipherEngine.init());
