class CryptoWorker {
    static VERSION = "5.2";
    
    constructor() {
        this.MIN_KEY_LENGTH = 2;
        this.MAX_KEY_LENGTH = 30;
        this.SEQ_LENGTH = 3;
        this.terminateRequested = false;
        this.FREQ_TOLERANCE = 0.15;
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

    async handleAnalysis(data) {
        try {
            const stages = [
                { name: "Идентификация длины ключа", weight: 0.4 },
                { name: "Частотный анализ", weight: 0.4 },
                { name: "Оптимизация ключа", weight: 0.2 }
            ];
            let totalProgress = 0;

            // Этап 1: Анализ Казиски
            const keyLengths = await this.kasiskiExamination(
                data.ciphertext,
                (pct) => this.reportProgress(
                    `${stages[0].name} (${pct}%)`,
                    totalProgress + pct * stages[0].weight
                )
            );
            totalProgress += stages[0].weight * 100;

            // Этап 2: Частотный анализ
            const baseKeys = await this.frequencyAnalysis(
                data.ciphertext,
                keyLengths,
                data.alphabet,
                (pct) => this.reportProgress(
                    `${stages[1].name} (${pct}%)`,
                    totalProgress + pct * stages[1].weight
                )
            );
            totalProgress += stages[1].weight * 100;

            // Этап 3: Уточнение ключа
            const bestKey = await this.refineKey(
                data.ciphertext,
                baseKeys,
                data.alphabet,
                (pct) => this.reportProgress(
                    `${stages[2].name} (${pct}%)`,
                    totalProgress + pct * stages[2].weight
                )
            );

            self.postMessage({
                type: 'RESULT',
                key: bestKey.key,
                confidence: bestKey.score,
                decrypted: bestKey.decrypted
            });

        } catch (error) {
            self.postMessage({ 
                type: 'ERROR', 
                message: error.message,
                stack: error.stack 
            });
        }
    }

    // ============== ОСНОВНЫЕ МЕТОДЫ АНАЛИЗА ==============

    async kasiskiExamination(text, progressCallback) {
        const sequences = new Map();
        const totalSteps = text.length - this.SEQ_LENGTH;
        
        // Поиск повторяющихся последовательностей
        for (let i = 0; i <= text.length - this.SEQ_LENGTH; i++) {
            if (this.terminateRequested) throw new Error("Анализ отменен");
            
            const seq = text.substr(i, this.SEQ_LENGTH);
            if (sequences.has(seq)) {
                sequences.get(seq).push(i);
            } else {
                sequences.set(seq, [i]);
            }
            
            if (i % 100 === 0) {
                const progress = Math.floor((i / totalSteps) * 100);
                progressCallback(progress);
                await this.delay(0);
            }
        }

        // Расчет факторов расстояний
        const factors = new Map();
        for (const [seq, positions] of sequences) {
            if (positions.length > 1) {
                for (let i = 1; i < positions.length; i++) {
                    const distance = positions[i] - positions[i-1];
                    this.primeFactors(distance).forEach(factor => {
                        if (factor >= this.MIN_KEY_LENGTH && factor <= this.MAX_KEY_LENGTH) {
                            factors.set(factor, (factors.get(factor) || 0) + 1);
                        }
                    });
                }
            }
        }

        // Возвращаем топ-3 кандидатов
        return [...factors.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(x => x[0]);
    }

    async frequencyAnalysis(text, keyLengths, alphabet, progressCallback) {
        const results = [];
        const totalKeys = keyLengths.length;
        
        for (let i = 0; i < totalKeys; i++) {
            if (this.terminateRequested) throw new Error("Анализ отменен");
            
            const key = await this.analyzeKeyLength(text, keyLengths[i], alphabet);
            results.push(key);
            progressCallback(Math.floor((i + 1) / totalKeys * 100));
            await this.delay(0);
        }
        
        return results;
    }

    async analyzeKeyLength(text, keyLength, alphabet) {
        const key = [];
        
        // Для каждой позиции в ключе
        for (let offset = 0; offset < keyLength; offset++) {
            const sequence = this.getSequence(text, offset, keyLength);
            const freqTable = this.buildFrequencyTable(sequence, alphabet);
            
            // Поиск оптимального сдвига
            let bestShift = 0;
            let bestScore = -Infinity;
            
            for (let shift = 0; shift < alphabet.length; shift++) {
                let score = 0;
                for (const char of alphabet) {
                    const originalPos = (alphabet.indexOf(char) - shift + alphabet.length) % alphabet.length;
                    score += (freqTable[char] || 0) * (FrequencyDictionary.ENGLISH[alphabet[originalPos]] || 0);
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestShift = shift;
                }
            }
            key.push(alphabet[bestShift]);
        }
        
        return key.join('');
    }

    async refineKey(ciphertext, keys, alphabet, progressCallback) {
        let bestResult = { key: '', score: -Infinity, decrypted: '' };
        const totalKeys = keys.length;
        
        for (let i = 0; i < totalKeys; i++) {
            if (this.terminateRequested) throw new Error("Анализ отменен");
            
            const variants = this.generateKeyVariants(keys[i], alphabet);
            for (const variant of variants) {
                const result = this.evaluateKey(ciphertext, variant, alphabet);
                if (result.score > bestResult.score) {
                    bestResult = result;
                }
            }
            progressCallback(Math.floor((i + 1) / totalKeys * 100));
            await this.delay(0);
        }
        
        return bestResult;
    }

    // ============== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==============

    generateKeyVariants(baseKey, alphabet) {
        const variants = [baseKey];
        
        // Генерация вариантов с заменой символов
        for (let i = 0; i < baseKey.length; i++) {
            const similar = this.getSimilarChars(baseKey[i], alphabet);
            similar.forEach(char => {
                variants.push(baseKey.slice(0, i) + char + baseKey.slice(i+1));
            });
        }
        
        return [...new Set(variants)];
    }

    evaluateKey(ciphertext, key, alphabet) {
        const decrypted = this.processText(ciphertext, key, alphabet);
        return {
            key: key,
            decrypted: decrypted,
            score: this.calculateKeyScore(decrypted)
        };
    }

    calculateKeyScore(decryptedText) {
        let score = 0;
        
        // 1. Проверка частот символов
        const freq = this.buildFrequencyTable(decryptedText, alphabet);
        for (const char in freq) {
            const expected = FrequencyDictionary.ENGLISH[char] || 0;
            score += 1 - Math.abs(freq[char] - expected);
        }
        
        // 2. Поиск общих слов
        const words = decryptedText.split(/[\s\W]+/);
        score += words.filter(w => CommonWords.includes(w.toUpperCase())).length * 10;
        
        // 3. Проверка повторяющихся паттернов
        const keyPattern = this.findRepeatingPattern(key);
        if (KeyPatterns.PATTERNS[keyPattern]) {
            score += KeyPatterns.PATTERNS[keyPattern] * 50;
        }
        
        return score;
    }

    buildFrequencyTable(text, alphabet) {
        const total = text.length || 1;
        const freq = {};
        alphabet.split('').forEach(c => freq[c] = 0);
        text.split('').forEach(c => freq[c] = (freq[c] || 0) + 1);
        for (const c in freq) freq[c] = (freq[c] / total).toFixed(4);
        return freq;
    }

    getSequence(text, start, step) {
        return Array.from(
            { length: Math.ceil((text.length - start) / step) },
            (_, i) => text[start + i * step]
        ).join('');
    }

    primeFactors(n) {
        const factors = new Set();
        while (n % 2 === 0) {
            factors.add(2);
            n /= 2;
        }
        for (let i = 3; i <= Math.sqrt(n); i += 2) {
            while (n % i === 0) {
                factors.add(i);
                n /= i;
            }
        }
        if (n > 2) factors.add(n);
        return [...factors];
    }

    getSimilarChars(char, alphabet) {
        const keyboardLayout = {
            'Q': ['W','A'], 'W': ['Q','E','S'], 'E': ['W','R','D'],
            // ... полная раскладка клавиатуры ...
        };
        return keyboardLayout[char] || [char];
    }

    findRepeatingPattern(key) {
        for (let len = 1; len <= key.length / 2; len++) {
            const pattern = key.substr(0, len);
            if (key === pattern.repeat(Math.ceil(key.length / len)).substr(0, key.length)) {
                return pattern;
            }
        }
        return key;
    }

    processText(text, key, alphabet) {
        return text.split('').map((c, i) => {
            const textPos = alphabet.indexOf(c);
            const keyPos = alphabet.indexOf(key[i % key.length]);
            return textPos !== -1 && keyPos !== -1
                ? alphabet[(textPos - keyPos + alphabet.length) % alphabet.length]
                : '_';
        }).join('');
    }

    reportProgress(message, percent) {
        if (this.terminateRequested) return;
        self.postMessage({
            type: 'PROGRESS',
            message: message,
            percent: Math.min(100, Math.max(0, Math.round(percent)))
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms || 0));
    }

    terminate() {
        this.terminateRequested = true;
        self.close();
    }
}

new CryptoWorker();
