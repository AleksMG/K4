class VigenereCracker {
    static ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    constructor() {
        this.worker = null;
    }

    encrypt(plainText, key) {
        return this._process(plainText, key, (p, k) => (p + k) % 26);
    }

    decrypt(cipherText, key) {
        return this._process(cipherText, key, (c, k) => (c - k + 26) % 26);
    }

    _process(text, key, operation) {
        const alpha = this.ALPHABET;
        const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');
        const cleanKey = key.toUpperCase().replace(/[^A-Z]/g, '');
        
        return cleanText.split('').map((char, idx) => {
            const textPos = alpha.indexOf(char);
            const keyPos = alpha.indexOf(cleanKey[idx % cleanKey.length]);
            return textPos === -1 || keyPos === -1 ? '?' : alpha[operation(textPos, keyPos)];
        }).join('');
    }

    async autoCrack(cipherText) {
        return new Promise((resolve) => {
            this.worker = new Worker('worker.js');
            this.worker.onmessage = (e) => resolve(e.data);
            this.worker.postMessage({ type: 'CRACK', cipherText });
        });
    }
}

class App {
    constructor() {
        this.cracker = new VigenereCracker();
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.elements = {
            ciphertext: document.getElementById('ciphertext'),
            knownText: document.getElementById('knownText'),
            key: document.getElementById('key'),
            alphabet: document.getElementById('alphabet'),
            plaintext: document.getElementById('plaintext'),
            progress: document.getElementById('progress'),
            progressFill: document.getElementById('progressFill'),
            progressText: document.getElementById('progressText'),
            cancelBtn: document.getElementById('cancelBtn')
        };
    }

    bindEvents() {
        this.elements.alphabet.addEventListener('input', () => this.decrypt());
        window.encrypt = () => this.encrypt();
        window.decrypt = () => this.decrypt();
        window.analyzeKnownPart = () => this.analyzeKnownPart();
        window.autoCrack = () => this.startAutoCrack();
        window.cancelAnalysis = () => this.cancelAnalysis();
    }

    updateProgress(percent, message) {
        this.elements.progress.style.display = 'block';
        this.elements.progressFill.style.width = `${percent}%`;
        this.elements.progressText.textContent = `${message} (${Math.round(percent)}%)`;
    }

    async startAutoCrack() {
        try {
            this.elements.cancelBtn.style.display = 'inline-block';
            this.updateProgress(0, 'Analyzing...');
            
            const result = await this.cracker.autoCrack(
                this.elements.ciphertext.value
            );
            
            this.elements.key.value = result.key;
            this.decrypt();
        } finally {
            this.resetUI();
        }
    }

    resetUI() {
        this.elements.progress.style.display = 'none';
        this.elements.cancelBtn.style.display = 'none';
    }

    cancelAnalysis() {
        if (this.cracker.worker) {
            this.cracker.worker.terminate();
            this.resetUI();
        }
    }

    analyzeKnownPart() {
        const cipherText = this.elements.ciphertext.value.toUpperCase();
        const knownText = this.elements.knownText.value.toUpperCase();
        const alpha = this.elements.alphabet.value.toUpperCase();
        
        let key = '';
        for (let i = 0; i < knownText.length; i++) {
            const cIdx = alpha.indexOf(cipherText[i]);
            const pIdx = alpha.indexOf(knownText[i]);
            key += cIdx !== -1 && pIdx !== -1 
                ? alpha[(cIdx - pIdx + alpha.length) % alpha.length] 
                : '?';
        }
        this.elements.key.value = key;
        this.decrypt();
    }

    encrypt() {
        this.elements.ciphertext.value = this.cracker.encrypt(
            this.elements.plaintext.value,
            this.elements.key.value
        );
    }

    decrypt() {
        this.elements.plaintext.value = this.cracker.decrypt(
            this.elements.ciphertext.value,
            this.elements.key.value
        );
    }
}

// Инициализация приложения
new App();
