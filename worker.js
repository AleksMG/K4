// worker.js v4.0 (Professional Edition)
class CryptoWorker {
    static VERSION = "4.0";
    
    constructor() {
        this.MIN_KEY_LENGTH = 2;
        this.MAX_KEY_LENGTH = 20;
        this.SEQ_LENGTH = 4;
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

    async handleAnalysis(data) {
        try {
            const { ciphertext, alphabet } = data;
            if (!ciphertext || ciphertext.length < 100) {
                throw new Error("Minimum 100 characters required for reliable analysis");
            }

            // Этап 1: Определение длины ключа
            self.postMessage({ type: 'PROGRESS', message: "Stage 1/3: Key length analysis..." });
            const keyLengths = await this.kasiskiExamination(ciphertext);
            
            // Этап 2: Частотный анализ
            self.postMessage({ type: 'PROGRESS', message: "Stage 2/3: Frequency analysis..." });
            const baseKeys = await Promise.all(
                keyLengths.map(length => this.frequencyAnalysis(ciphertext, length, alphabet))
            );
            
            // Этап 3: Уточнение ключа
            self.postMessage({ type: 'PROGRESS', message: "Stage 3/3: Key refinement..." });
            const refinedKeys = await Promise.all(
                baseKeys.map(key => this.refineKey(ciphertext, key, alphabet))
            );

            // Выбор лучшего ключа
            const bestKey = this.selectBestKey(ciphertext, refinedKeys, alphabet);
            
            self.postMessage({
                type: 'RESULT',
                key: bestKey.key,
                confidence: bestKey.confidence,
                decrypted: bestKey.decrypted
            });

        } catch (error) {
            self.postMessage({ type: 'ERROR', message: error.message });
        }
    }

    // ================== КОРЕВЫЕ МЕТОДЫ АНАЛИЗА ==================

    async kasiskiExamination(text) {
        const sequences = new Map();
        
        // Поиск повторяющихся последовательностей
        for (let i = 0; i <= text.length - this.SEQ_LENGTH; i++) {
            const seq = text.substr(i, this.SEQ_LENGTH);
            if (sequences.has(seq)) {
                sequences.get(seq).push(i);
            } else {
                sequences.set(seq, [i]);
            }
        }

        // Расчет расстояний
        const distances = [];
        for (const [seq, positions] of sequences) {
            if (positions.length > 1) {
                for (let i = 1; i < positions.length; i++) {
                    distances.push(positions[i] - positions[i-1]);
                }
            }
        }

        // Факторизация расстояний
        const factorCounts = new Map();
        for (const distance of distances) {
            const factors = this.primeFactors(distance);
            factors.forEach(factor => {
                if (factor >= this.MIN_KEY_LENGTH && factor <= this.MAX_KEY_LENGTH) {
                    factorCounts.set(factor, (factorCounts.get(factor) || 0) + 1);
                }
            });
        }

        // Возвращаем топ-3 вероятные длины
        return [...factorCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(x => x[0]);
    }

    async frequencyAnalysis(text, keyLength, alphabet) {
        const key = [];
        for (let offset = 0; offset < keyLength; offset++) {
            const sequence = this.getSequence(text, offset, keyLength);
            const freqTable = this.buildFrequencyTable(sequence, alphabet);
            
            let bestShift = 0;
            let bestScore = -Infinity;
            
            for (let shift = 0; shift < alphabet.length; shift++) {
                let score = 0;
                for (const char of alphabet) {
                    const originalIndex = (alphabet.indexOf(char) - shift + alphabet.length) % alphabet.length;
                    const expectedFreq = FrequencyDictionary.ENGLISH[alphabet[originalIndex]] || 0;
                    score += (freqTable[char] || 0) * expectedFreq;
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

    async refineKey(ciphertext, baseKey, alphabet) {
        const keyVariants = [baseKey];
        
        // Генерация вариантов ключа
        for (let i = 0; i < baseKey.length; i++) {
            const currentChar = baseKey[i];
            const similarChars = this.getSimilarChars(currentChar, alphabet);
            similarChars.forEach(char => {
                const variant = baseKey.slice(0, i) + char + baseKey.slice(i+1);
                keyVariants.push(variant);
            });
        }

        // Проверка вариантов
        const scoredKeys = keyVariants.map(key => {
            const decrypted = this.processText(ciphertext, key, alphabet);
            return {
                key: key,
                score: this.calculateKeyScore(decrypted)
            };
        });

        return scoredKeys.sort((a, b) => b.score - a.score)[0].key;
    }

    // ================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==================

    getSequence(text, start, step) {
        return Array.from(
            { length: Math.ceil((text.length - start) / step) },
            (_, i) => text[start + i * step]
        ).join('');
    }

    buildFrequencyTable(text, alphabet) {
        const table = {};
        alphabet.forEach(c => table[c] = 0);
        text.split('').forEach(c => table[c] = (table[c] || 0) + 1);
        return table;
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
        const similarMap = {
            'A': ['S', 'E', 'D'],
            'E': ['A', 'D', 'R'],
            'I': ['J', 'K', 'O'],
            'O': ['I', 'P', 'K'],
            'T': ['F', 'G', 'Y']
        };
        return similarMap[char] || [char];
    }

    calculateKeyScore(decryptedText) {
        const words = decryptedText.split(/[\s\W]+/);
        const wordScore = words.filter(w => CommonWords.includes(w.toUpperCase())).length * 10;
        const charScore = decryptedText.split('').filter(c => c !== '_').length * 0.1;
        return wordScore + charScore;
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

    selectBestKey(ciphertext, keys, alphabet) {
        const results = keys.map(key => ({
            key: key,
            decrypted: this.processText(ciphertext, key, alphabet),
            score: this.calculateKeyScore(this.processText(ciphertext, key, alphabet))
        }));

        return results.sort((a, b) => b.score - a.score)[0];
    }

    terminate() {
        this.terminateRequested = true;
        self.close();
    }
}

new CryptoWorker();
