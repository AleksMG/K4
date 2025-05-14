class CryptoWorker {
    static ENGLISH_FREQ = [
        8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0,
        0.2, 0.8, 4.0, 2.4, 6.7, 7.5, 1.9, 0.1, 6.0,
        6.3, 9.1, 2.8, 1.0, 2.4, 0.2, 2.0, 0.1
    ];

    constructor() {
        self.addEventListener('message', this.handleMessage.bind(this));
    }

    handleMessage(e) {
        const { type, cipherText } = e.data;
        if (type === 'CRACK') {
            const key = this.crack(cipherText);
            self.postMessage({ key });
        }
    }

    crack(cipherText) {
        const keyLength = this.kasiskiTest(cipherText);
        return this.frequencyAnalysis(cipherText, keyLength);
    }

    kasiskiTest(text) {
        const seqMap = new Map();
        const factors = new Map();
        
        for (let i = 0; i < text.length - 3; i++) {
            const seq = text.substr(i, 3);
            if (seqMap.has(seq)) {
                const distance = i - seqMap.get(seq);
                this.calculateFactors(distance).forEach(f => 
                    factors.set(f, (factors.get(f) || 0) + 1)
            }
            seqMap.set(seq, i);
        }
        
        return [...factors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 3;
    }

    frequencyAnalysis(text, keyLength) {
        return Array.from({ length: keyLength }, (_, i) => {
            const group = text.split('').filter((_, idx) => idx % keyLength === i);
            return String.fromCharCode(65 + this.findBestShift(group));
        }).join('');
    }

    findBestShift(group) {
        const freq = this.calculateFrequency(group);
        return CryptoWorker.ENGLISH_FREQ.reduce((best, _, shift) => {
            const score = CryptoWorker.ENGLISH_FREQ.reduce((sum, engFreq, idx) => 
                sum + engFreq * freq[(idx + shift) % 26], 0);
            return score > best.score ? { shift, score } : best;
        }, { shift: 0, score: 0 }).shift;
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

    calculateFrequency(chars) {
        const count = new Array(26).fill(0);
        chars.forEach(c => count[c.charCodeAt(0) - 65]++);
        return count.map(c => c / chars.length);
    }
}

new CryptoWorker();
