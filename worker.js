// Метод Казиски
function kasiskiMethod(cipherText) {
    const seqLength = 3;
    const sequences = new Map();
    const distances = [];
    
    for (let i = 0; i < cipherText.length - seqLength; i++) {
        const seq = cipherText.substr(i, seqLength);
        if (sequences.has(seq)) {
            distances.push(i - sequences.get(seq));
        } else {
            sequences.set(seq, i);
        }
    }
    
    // Вычисляем НОД
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    return distances.reduce((a, b) => gcd(a, b), distances[0]) || 3;
}

// Частотный анализ
function frequencyAnalysis(cipherText, alphabet, keyLength) {
    const alpha = alphabet.toUpperCase();
    const groups = Array.from({ length: keyLength }, () => ({}));
    
    // Распределяем символы
    for (let i = 0; i < cipherText.length; i++) {
        const char = cipherText[i];
        const groupIdx = i % keyLength;
        groups[groupIdx][char] = (groups[groupIdx][char] || 0) + 1;
    }
    
    // Эталонные частоты (английский)
    const ENGLISH_FREQ = {
        'A':0.08167, 'B':0.01492, 'C':0.02782, 'D':0.04258, 'E':0.12702,
        'F':0.02228, 'G':0.02015, 'H':0.06094, 'I':0.06966, 'J':0.00153,
        'K':0.00772, 'L':0.04025, 'M':0.02406, 'N':0.06749, 'O':0.07507,
        'P':0.01929, 'Q':0.00095, 'R':0.05987, 'S':0.06327, 'T':0.09056,
        'U':0.02758, 'V':0.00978, 'W':0.02360, 'X':0.00150, 'Y':0.01974, 'Z':0.00074
    };
    
    // Подбор ключа
    let key = "";
    for (const group of groups) {
        let bestShift = 0;
        let bestScore = -Infinity;
        
        for (let shift = 0; shift < alpha.length; shift++) {
            let score = 0;
            for (const [char, count] of Object.entries(group)) {
                const original = alpha[(alpha.indexOf(char) - shift + alpha.length) % alpha.length];
                score += (count / cipherText.length) * (ENGLISH_FREQ[original] || 0);
            }
            if (score > bestScore) {
                bestScore = score;
                bestShift = shift;
            }
        }
        key += alpha[bestShift];
    }
    return key;
}

// Обработчик Web Worker
self.addEventListener("message", (e) => {
    const { type, data } = e.data;
    
    if (type === "ANALYZE") {
        const cipherText = data.cipherText;
        const keyLength = kasiskiMethod(cipherText);
        const key = frequencyAnalysis(cipherText, data.alphabet, keyLength);
        self.postMessage({ type: "RESULT", key });
    }
});
