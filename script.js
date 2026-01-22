const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const statusText = document.getElementById('status');
const startBtn = document.getElementById('startBtn');

let isScanning = false;
let resultBuffer = []; 
const BUFFER_SIZE = 8; 

// 🎯 台灣機車規則
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
        statusText.innerText = "機車規則掃描中";
        isScanning = true;
        processFrame();
    } catch (err) { alert("請使用 HTTPS 並開啟權限"); }
}

async function processFrame() {
    if (!isScanning) return;

    const ctx = canvas.getContext('2d');
    // 提高畫布解析度以看清字體細節
    canvas.width = 800; 
    canvas.height = 400;

    const sx = video.videoWidth * 0.2;
    const sy = video.videoHeight * 0.2;
    const sw = video.videoWidth * 0.6;
    const sh = video.videoHeight * 0.4;

    // --- 【核心提升：影像增強】 ---
    // 使用更高倍率的對比度，並稍微調低亮度以壓制反光，這能幫助 9 的圓圈封閉
    ctx.filter = 'contrast(3) grayscale(1) brightness(0.9)';
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 800, 400);

    try {
        const result = await Tesseract.recognize(canvas, 'eng', {
            // 限定白名單
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7',
            // 加入 OCR 引擎微調參數 (若 Tesseract 支援可加入)
            tessjs_create_hocr: '0',
            tessjs_create_tsv: '0',
        });

        let cleanText = result.data.text.replace(/[^A-Z0-9]/g, "");
        
        if (validateTaiwanMoto(cleanText)) {
            resultBuffer.push(cleanText);
            if (resultBuffer.length > BUFFER_SIZE) resultBuffer.shift();

            const counts = {};
            resultBuffer.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
            const mostFrequent = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            
            const confidence = (counts[mostFrequent] / resultBuffer.length);
            previewText.innerText = `穩定度: ${Math.round(confidence * 100)}%`;

            // 【自動確認】提高穩定度門檻到 0.75 (8次中要有6次一樣)，確保不是閃爍誤讀
            if (confidence >= 0.75) {
                isScanning = false;
                handleSuccess(mostFrequent);
            }
        } else {
            previewText.innerText = "正在分析車牌...";
        }
    } catch (e) {}

    if (isScanning) setTimeout(processFrame, 450);
}

function handleSuccess(plate) {
    plateDisplay.innerText = plate;
    plateDisplay.style.color = "#34C759";
    document.querySelector('.scan-frame').classList.add('success-mode');
    if (navigator.vibrate) navigator.vibrate(200);
    const speech = new SpeechSynthesisUtterance(`辨識成功 ${plate.split('').join(' ')}`);
    window.speechSynthesis.speak(speech);

    setTimeout(() => {
        if(confirm(`辨識結果：${plate}\n是否繼續？`)) resetScanner();
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
