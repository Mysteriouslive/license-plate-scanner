const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const statusText = document.getElementById('status');
const startBtn = document.getElementById('startBtn');

let isScanning = false;
let resultBuffer = []; 
const BUFFER_SIZE = 8; 

// 🎯 台灣機車車牌規則過濾 (包含新/舊白牌、黃紅牌、電動車)
function validateTaiwanMoto(text) {
    const rules = [
        /^[A-Z]{3}[0-9]{4}$/, // 新式 3英4數
        /^[A-Z]{3}[0-9]{3}$/, // 舊式 3英3數
        /^E[A-Z]{2}[0-9]{4}$/, // 電動車 E開頭
        /^[0-9]{3}[A-Z]{3}$/  // 倒置式 3數3英
    ];
    return rules.some(rule => rule.test(text));
}

async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1920 } } 
        });
        video.srcObject = stream;
        startBtn.style.display = "none";
        statusText.innerText = "機車規則掃描中";
        isScanning = true;
        processFrame();
    } catch (err) { alert("請確保使用 HTTPS 並開啟相機權限"); }
}

async function processFrame() {
    if (!isScanning) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 600; canvas.height = 300;

    // 影像裁切：精確抓取視訊流中上方的 35% 區域
    const sx = video.videoWidth * 0.2;
    const sy = video.videoHeight * 0.2;
    const sw = video.videoWidth * 0.6;
    const sh = video.videoHeight * 0.4;

    // 影像預處理：強烈對比轉黑白，移除符號干擾
    ctx.filter = 'contrast(2.2) grayscale(1) brightness(1.1)';
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);

    try {
        const result = await Tesseract.recognize(canvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7',
        });

        let cleanText = result.data.text.replace(/[^A-Z0-9]/g, "");
        
        if (validateTaiwanMoto(cleanText)) {
            resultBuffer.push(cleanText);
            if (resultBuffer.length > BUFFER_SIZE) resultBuffer.shift();

            // 統計緩衝區中最常出現的結果
            const counts = {};
            resultBuffer.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
            const mostFrequent = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            
            const confidence = (counts[mostFrequent] / resultBuffer.length);
            previewText.innerText = `穩定度: ${Math.round(confidence * 100)}%`;

            // 自動確認：連續採樣穩定度超過 60% 則自動鎖定
            if (confidence >= 0.6) {
                isScanning = false;
                handleSuccess(mostFrequent);
            }
        } else {
            previewText.innerText = "請將機車車牌對準框內";
        }
    } catch (e) {}

    if (isScanning) setTimeout(processFrame, 400);
}

function handleSuccess(plate) {
    plateDisplay.innerText = plate;
    plateDisplay.style.color = "#34C759";
    document.querySelector('.scan-frame').classList.add('success-mode');
    
    // 震動與語音回饋
    if (navigator.vibrate) navigator.vibrate(200);
    const speech = new SpeechSynthesisUtterance(`辨識成功 ${plate.split('').join(' ')}`);
    window.speechSynthesis.speak(speech);

    setTimeout(() => {
        if(confirm(`辨識結果：${plate}\n要重新掃描下一台嗎？`)) {
            resetScanner();
        }
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
