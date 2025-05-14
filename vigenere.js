// ================== Основные функции ================== 
let worker;

// Шифрование
function vigenereEncrypt(plainText, key, alphabet) {
    if (!plainText || !key || !alphabet) return "";
    const alpha = alphabet.toUpperCase();
    const text = plainText.toUpperCase();
    const k = key.toUpperCase();
    let result = "";
    
    for (let i = 0; i < text.length; i++) {
        const textChar = text[i];
        const keyChar = k[i % k.length];
        const textIndex = alpha.indexOf(textChar);
        const keyIndex = alpha.indexOf(keyChar);
        
        if (textIndex === -1 || keyIndex === -1) {
            result += textChar;
            continue;
        }
        result += alpha[(textIndex + keyIndex) % alpha.length];
    }
    return result;
}

// Дешифрование
function vigenereDecrypt(cipherText, key, alphabet) {
    if (!cipherText || !key || !alphabet) return "";
    const alpha = alphabet.toUpperCase();
    const cipher = cipherText.toUpperCase();
    const k = key.toUpperCase();
    let result = "";
    
    for (let i = 0; i < cipher.length; i++) {
        const cipherChar = cipher[i];
        const keyChar = k[i % k.length];
        const cipherIndex = alpha.indexOf(cipherChar);
        const keyIndex = alpha.indexOf(keyChar);
        
        if (cipherIndex === -1 || keyIndex === -1) {
            result += cipherChar;
            continue;
        }
        result += alpha[(cipherIndex - keyIndex + alpha.length) % alpha.length];
    }
    return result;
}

// ================== Подбор ключа ================== 
function findKeyFromPlaintext(cipherText, plaintext, alphabet) {
    if (!cipherText || !plaintext || !alphabet) return "";
    const alpha = alphabet.toUpperCase();
    const cipher = cipherText.toUpperCase();
    const known = plaintext.toUpperCase();
    let key = "";
    
    for (let i = 0; i < known.length; i++) {
        const cipherChar = cipher[i];
        const knownChar = known[i];
        const cipherIndex = alpha.indexOf(cipherChar);
        const knownIndex = alpha.indexOf(knownChar);
        
        if (cipherIndex === -1 || knownIndex === -1) {
            key += "?";
            continue;
        }
        key += alpha[(cipherIndex - knownIndex + alpha.length) % alpha.length];
    }
    return key;
}

function analyzeKnownPart() {
    const cipherText = document.getElementById("ciphertext").value;
    const knownText = document.getElementById("knownText").value;
    const alphabet = document.getElementById("alphabet").value;
    const foundKey = findKeyFromPlaintext(cipherText, knownText, alphabet);
    
    if (foundKey) {
        document.getElementById("key").value = foundKey;
        decrypt();
    } else {
        alert("❌ Не удалось подобрать ключ!");
    }
}

// ================== Web Worker ================== 
function initWorker() {
    if (!worker) {
        worker = new Worker("worker.js");
        worker.onmessage = function(e) {
            if (e.data.type === "RESULT") {
                document.getElementById("key").value = e.data.key;
                decrypt();
                updateProgress(100, "✅ Готово!");
                setTimeout(() => {
                    document.getElementById("progress").style.display = "none";
                }, 2000);
            } else if (e.data.type === "PROGRESS") {
                updateProgress(e.data.percent, e.data.message);
            }
        };
    }
}

function autoCrack() {
    const cipherText = document.getElementById("ciphertext").value;
    const alphabet = document.getElementById("alphabet").value;
    
    if (!cipherText) {
        alert("Введите шифротекст!");
        return;
    }
    
    initWorker();
    document.getElementById("cancelBtn").style.display = "inline-block";
    updateProgress(0, "🔍 Анализ методом Казиски...");
    worker.postMessage({
        type: "ANALYZE",
        data: { cipherText, alphabet }
    });
}

function cancelAnalysis() {
    if (worker) {
        worker.terminate();
        worker = null;
        updateProgress(0, "⛔ Анализ отменён");
        document.getElementById("cancelBtn").style.display = "none";
    }
}

// ================== Визуализация ================== 
function drawFrequencyChart(text, alphabet) {
    const canvas = document.getElementById("frequencyChart");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const freqMap = {};
    const alpha = alphabet.toUpperCase();
    text = text.toUpperCase();
    
    // Считаем частоты
    for (const char of text) {
        if (alpha.includes(char)) {
            freqMap[char] = (freqMap[char] || 0) + 1;
        }
    }
    
    // Рисуем график
    const barWidth = 30;
    let x = 20;
    alpha.split("").forEach(char => {
        const count = freqMap[char] || 0;
        const height = (count / text.length) * 300;
        
        ctx.fillStyle = "#2196F3";
        ctx.fillRect(x, canvas.height - height - 40, barWidth, height);
        
        ctx.fillStyle = "#333";
        ctx.fillText(char, x + 10, canvas.height - 20);
        x += barWidth + 10;
    });
}

// ================== Оптимизация алфавита ================== 
function optimizeAlphabet(cipherText, knownText, baseAlphabet) {
    let bestAlphabet = baseAlphabet;
    let bestScore = 0;
    
    for (let i = 0; i < 100; i++) {
        updateProgress(i, `🌀 Поколение ${i}`);
        const candidate = mutateAlphabet(bestAlphabet);
        const key = findKeyFromPlaintext(cipherText, knownText, candidate);
        const score = key.replace(/\?/g, "").length;
        
        if (score > bestScore) {
            bestScore = score;
            bestAlphabet = candidate;
        }
    }
    return bestAlphabet;
}

function mutateAlphabet(alphabet) {
    const arr = alphabet.split("");
    for (let i = 0; i < 3; i++) {
        const a = Math.floor(Math.random() * arr.length);
        const b = Math.floor(Math.random() * arr.length);
        [arr[a], arr[b]] = [arr[b], arr[a]];
    }
    return arr.join("");
}

function optimizeAlphabetHandler() {
    const cipherText = document.getElementById("ciphertext").value;
    const knownText = document.getElementById("knownText").value;
    const baseAlphabet = document.getElementById("alphabet").value;
    
    if (!cipherText || !knownText) {
        alert("Введите шифротекст и известный фрагмент!");
        return;
    }
    
    const optimized = optimizeAlphabet(cipherText, knownText, baseAlphabet);
    document.getElementById("alphabet").value = optimized;
    analyzeKnownPart();
}

// ================== Вспомогательные функции ================== 
function updateProgress(percent, message) {
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    const progressDiv = document.getElementById("progress");
    
    progressDiv.style.display = "block";
    progressBar.style.width = percent + "%";
    progressText.textContent = message + ` (${Math.round(percent)}%)`;
}

// Инициализация
document.getElementById("alphabet").addEventListener("input", () => {
    decrypt();
});
