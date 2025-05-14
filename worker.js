class CryptoWorker {
    constructor() {
        this.MIN_KEY_LENGTH = 3;
        this.MAX_KEY_LENGTH = 30;
        this.ENGLISH_FREQUENCIES = [
            0.08167, 0.01492, 0.02782, 0.04253, 0.12702, 0.02228,
            0.02015, 0.06094, 0.06966, 0.00153, 0.00772, 0.04025,
            0.02406, 0.06749, 0.07507, 0.01929, 0.00095, 0.05987,
            0.06327, 0.09056, 0.02758, 0.00978, 0.02360, 0.00150,
            0.01974, 0.00074
        ];
        this.init();
    }

    init() {
        self.addEventListener('message', (e) => {
            if (e.data.type === 'ANALYZE') {
                this.handleAnalysis(e.data);
            } else if (e.data.type === 'TERMINATE') {
                self.close();
            }
        });
    }

    handleAnalysis(data) {
        try {
            const startTime = Date.now();
            const { ciphertext, alphabet } = data;
            
            // Этап 1: Определение длины ключа
            const keyLength = this.kasiskiExamination(ciphertext);
            self.postMessage({
                type: 'PROGRESS',
                message: `Определена длина ключа: ${keyLength}`
            });

            // Этап 2: Частотный анализ
            const rawKey = this.frequencyAnalysis(ciphertext, keyLength, alphabet);
            self.postMessage({
                type: 'PROGRESS',
                message: `Предварительный ключ: ${rawKey}`
            });

            // Этап 3: Уточнение ключа
            const refinedKey = this.refineKey(rawKey, ciphertext, alphabet);
            
            self.postMessage({
                type: 'RESULT',
                key: refinedKey,
                keyLength: keyLength,
                time: Date.now() - startTime
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
        const distances = [];
        const sequences = new Map();

        // Поиск повторяющихся последовательностей
        for (let i = 0; i < text.length - seqLength; i++) {
            const seq = text.substr(i, seqLength);
            if (sequences.has(seq)) {
                const prevPos = sequences.get(seq);
                distances.push(i - prevPos);
            } else {
                sequences.set(seq, i);
            }
        }

        // Вычисление НОД для расстояний
        const factors = new Map();
        for (const distance of distances) {
            this.getFactors(distance).forEach(f => {
                if (f >= this.MIN_KEY_LENGTH && f <= this.MAX_KEY_LENGTH) {
                    factors.set(f, (factors.get(f) || 0) + 1);
                }
            });
        }

        // Возвращаем наиболее вероятную длину
        const sortedFactors = [...factors.entries()].sort((a, b) => b[1] - a[1]);
        return sortedFactors[0]?.[0] || this.estimateWithIC(text);
    }

    estimateWithIC(text) {
        // Оценка через индекс совпадений
        const maxLength = Math.min(20, Math.floor(text.length / 2));
        let bestLength = 3;
        let bestIC = 0;

        for (let L = this.MIN_KEY_LENGTH; L <= maxLength; L++) {
            let totalIC = 0;
            for (let i = 0; i < L; i++) {
                const seq = this.getSequence(text, i, L);
                totalIC += this.calculateIC(seq);
            }
            const avgIC = totalIC / L;
            if (avgIC > bestIC) {
                bestIC = avgIC;
                bestLength = L;
            }
        }
        return bestLength;
    }

    frequencyAnalysis(text, keyLength, alphabet) {
        const columns = Array.from({ length: keyLength }, () => []);
        
        // Распределение символов по колонкам
        for (let i = 0; i < text.length; i++) {
            columns[i % keyLength].push(text[i]);
        }

        // Анализ каждой колонки
        return columns.map(col => {
            const freqMap = this.calculateFrequencies(col.join(''), alphabet);
            return this.findBestShift(freqMap, alphabet);
        }).join('');
    }

    refineKey(key, ciphertext, alphabet) {
        // Проверка общих слов в ключе
        const commonPatterns = ['THE', 'AND', 'ING', 'ION', 'ENT'];
        for (const pattern of commonPatterns) {
            if (key.includes(pattern)) {
                return pattern;
            }
        }
        return key;
    }

    // Вспомогательные методы
    getFactors(n) {
        const factors = new Set();
        for (let i = 2; i <= Math.sqrt(n); i++) {
            if (n % i === 0) {
                factors.add(i);
                factors.add(n / i);
            }
        }
        return [...factors];
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

    getSequence(text, start, step) {
        return text.split('').filter((_, i) => i % step === start).join('');
    }

    calculateFrequencies(text, alphabet) {
        const freqMap = {};
        for (const c of text) {
            freqMap[c] = (freqMap[c] || 0) + 1;
        }
        return alphabet.split('').map(c => (freqMap[c] || 0) / text.length);
    }

    findBestShift(freqMap, alphabet) {
        let bestShift = 0;
        let bestScore = 0;

        for (let shift = 0; shift < alphabet.length; shift++) {
            let score = 0;
            for (let i = 0; i < alphabet.length; i++) {
                const originalPos = (i - shift + alphabet.length) % alphabet.length;
                score += freqMap[alphabet[originalPos]] * this.ENGLISH_FREQUENCIES[i];
            }
            if (score > bestScore) {
                bestScore = score;
                bestShift = shift;
            }
        }
        return alphabet[bestShift];
    }
}

new CryptoWorker();
