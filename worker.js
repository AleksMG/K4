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
            const keyLength = this.kasiskiExamination(ciphertext);
            self.postMessage({ type: 'PROGRESS', message: `Предполагаемая длина ключа: ${keyLength}` });
            
            const key = this.frequencyAnalysis(ciphertext, keyLength, alphabet);
            self.postMessage({ type: 'RESULT', key: key });
            
        } catch (error) {
            self.postMessage({ type: 'ERROR', message: error.message });
        }
    }

    kasiskiExamination(text) {
        const seqMap = new Map();
        const factors = new Map();
        
        for (let i = 0; i < text.length - 3; i++) {
            const seq = text.substr(i, 3);
            if (seqMap.has(seq)) {
                const dist = i - seqMap.get(seq);
                this.calculateFactors(dist).forEach(f => {
                    if (f >= this.MIN_KEY_LENGTH && f <= this.MAX_KEY_LENGTH) {
                        factors.set(f, (factors.get(f) || 0) + 1);
                    }
                });
            } else {
                seqMap.set(seq, i);
            }
        }
        
        return [...factors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 3;
    }

    frequencyAnalysis(text, keyLength, alphabet) {
        const freqTables = Array.from({ length: keyLength }, () => new Array(alphabet.length).fill(0));
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const tableIdx = i % keyLength;
            const charIdx = alphabet.indexOf(char);
            if (charIdx !== -1) freqTables[tableIdx][charIdx]++;
        }
        
        return freqTables.map(table => {
            const scores = table.map((count, idx) => 
                count * this.ENGLISH_FREQ[idx % this.ENGLISH_FREQ.length]
            );
            return alphabet[scores.indexOf(Math.max(...scores))];
        }).join('');
    }

    calculateFactors(n) {
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
