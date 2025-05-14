class CryptoWorker {
    constructor() {
        this.MIN_KEY_LENGTH = 2;
        this.MAX_KEY_LENGTH = 30;
        this.ENGLISH_FREQ = [
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
            }
        });
    }

    handleAnalysis(data) {
        try {
            const { ciphertext, alphabet } = data;
            
            // Шаг 1: Определение длины ключа
            const keyLength = this.kasiskiMethod(ciphertext);
            self.postMessage({ type: 'PROGRESS', message: `Key length: ${keyLength}` });

            // Шаг 2: Частотный анализ
            const key = this.frequencyAnalysis(ciphertext, keyLength, alphabet);
            
            // Шаг 3: Проверка по словарю
            const refinedKey = this.dictionaryCheck(key);
            
            self.postMessage({ type: 'RESULT', key: refinedKey });

        } catch (error) {
            self.postMessage({ type: 'ERROR', message: error.message });
        }
    }

    kasiskiMethod(text) {
        const seqMap = new Map();
        const factors = new Map();

        for (let i = 0; i < text.length - 2; i++) {
            const trigram = text.substr(i, 3);
            if (seqMap.has(trigram)) {
                const distance = i - seqMap.get(trigram);
                this.getFactors(distance).forEach(f => {
                    if (f >= this.MIN_KEY_LENGTH && f <= this.MAX_KEY_LENGTH) {
                        factors.set(f, (factors.get(f) || 0) + 1);
                    }
                });
            } else {
                seqMap.set(trigram, i);
            }
        }

        const sorted = [...factors.entries()].sort((a, b) => b[1] - a[1]);
        return sorted[0]?.[0] || this.MAX_KEY_LENGTH;
    }

    frequencyAnalysis(text, keyLength, alphabet) {
        const freqTables = Array.from({ length: keyLength }, () => 
            new Array(alphabet.length).fill(0));

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const tableIdx = i % keyLength;
            const charIdx = alphabet.indexOf(char);
            if (charIdx !== -1) freqTables[tableIdx][charIdx]++;
        }

        return freqTables.map(table => {
            const scores = table.map((count, idx) => 
                count * this.ENGLISH_FREQ[idx % 26]
            );
            return alphabet[scores.indexOf(Math.max(...scores))];
        }).join('');
    }

    dictionaryCheck(key) {
        const commonWords = ['THE', 'AND', 'THAT', 'HAVE', 'WITH'];
        for (const word of commonWords) {
            if (key.includes(word)) {
                return word;
            }
        }
        return key;
    }

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
}

new CryptoWorker();
