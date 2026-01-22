const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const statusText = document.getElementById('status');
const startBtn = document.getElementById('startBtn');

let isScanning = false;
let resultBuffer = []; 
const BUFFER_SIZE = 10; // 增加取樣數，提升穩定度

function validateTaiwanMoto(text) {
    const rules = [/^[A-Z]{3}[0-9]{4}$/, /^[A-Z]{3}[0-9]{3}$/, /^E[A-Z]{2}[0-9]{4}$/, /^[0-9]{3}[A-Z]{3}$/];
    return rules.some(rule => rule.test(text));
}

async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1920 } } 
        });
        video.srcObject = stream;
        startBtn.style.display = "none";
        statusText.innerText = "機車模式：深度掃描中";
        isScanning = true;
        processFrame();
    } catch (err) { alert("無法啟動相機"); }
}

async function processFrame() {
    if (!isScanning) return;

    const ctx = canvas.getContext('2d');
    // 提升解析度是解決 9/3 誤認的關鍵
    canvas.width = 1000; 
    canvas.height = 500;

    const sx = video.videoWidth * 0.2;
    const sy = video.videoHeight * 0.25;
    const sw = video.videoWidth * 0.6;
    const sh = video.videoHeight * 0.4;

    // --- 【影像深度強化】 ---
    // 1. 強力對比度 (3.5) 確保黑白分明
    // 2. 降低亮度 (0.8) 壓制車牌反光
    // 3. 銳化濾鏡 (透過多次重繪模擬)
    ctx.filter = 'contrast(3.5) grayscale(1) brightness(0.8) blur(0.5px) invert(0)';
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 1000, 500);

    // 模擬影像膨脹 (讓字體筆畫變粗，封閉 9 的圓圈)
    ctx.globalCompositeOperation = 'darken';
    ctx.drawImage(canvas, 1, 1);
    ctx.globalCompositeOperation = 'source-over';

    try {
        const result = await Tesseract.recognize(canvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7', // 強制單行模式
        });

        let cleanText = result.data.text.replace(/[^A-Z0-9]/g, "");
        
        if (validateTaiwanMoto(cleanText)) {
            resultBuffer.push(cleanText);
            if (resultBuffer.length > BUFFER_SIZE) resultBuffer.shift();

            const counts = {};
            resultBuffer.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
            const mostFrequent = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            
            const confidence = (counts[mostFrequent] / resultBuffer.length);
            previewText.innerText = `穩定度: ${Math.round(confidence * 100)}% | 偵測: ${cleanText}`;

            // 只有當連續取樣中 70% 都是同一個號碼才自動鎖定
            if (confidence >= 0.7) {
                isScanning = false;
                handleSuccess(mostFrequent);
            }
        }
    } catch (e) {}

    if (isScanning) setTimeout(processFrame, 400);
}

function handleSuccess(plate) {
    plateDisplay.innerText = plate;
    plateDisplay.style.color = "#34C759";
    document.querySelector('.scan-frame').classList.add('success-mode');
    if (navigator.vibrate) navigator.vibrate(200);
    
    // 讀報
    const speech = new SpeechSynthesisUtterance(`辨識成功 ${plate.split('').join(' ')}`);
    window.speechSynthesis.speak(speech);

    setTimeout(() => {
        if(confirm(`確認車牌：${plate}\n繼續掃描下一台？`)) resetScanner();
    }, 500);
}

function resetScanner() {
    plateDisplay.innerText = "----";
    plateDisplay.style.color = "white";
    document.querySelector('.scan-frame').classList.remove('success-mode');
    isScanning = true;
    resultBuffer = [];
    processFrame();
}

startBtn.addEventListener('click', initCamera);
