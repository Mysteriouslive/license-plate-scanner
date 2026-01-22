const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const confirmBtn = document.getElementById('confirmBtn');
const startBtn = document.getElementById('startBtn');
const statusText = document.getElementById('status');

let isScanning = false;

// 啟動相機
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: 1280 } 
        });
        video.srcObject = stream;
        startBtn.style.display = "none";
        statusText.innerText = "SCANNING...";
        isScanning = true;
        requestAnimationFrame(processFrame);
    } catch (err) {
        statusText.innerText = "CAMERA ERROR";
        alert("請確保已開啟相機權限且使用 HTTPS 連線");
    }
}

// 循環處理影像
async function processFrame() {
    if (!isScanning) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 200;

    // 擷取視訊中央區域給 OCR
    const sourceX = video.videoWidth * 0.2;
    const sourceY = video.videoHeight * 0.3;
    const sourceW = video.videoWidth * 0.6;
    const sourceH = video.videoHeight * 0.4;

    ctx.drawImage(video, sourceX, sourceY, sourceW, sourceH, 0, 0, 400, 200);
    
    // 影像預處理：提升對比度與轉為灰階，增加辨識率
    ctx.filter = 'contrast(1.5) grayscale(1)';

    try {
        const result = await Tesseract.recognize(canvas, 'eng', {
            // 強制白名單：只偵測英數
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        });

        // 二次過濾非英數符號
        let cleanText = result.data.text.replace(/[^A-Z0-9]/g, "");
        previewText.innerText = "偵測中: " + (cleanText || "...");

        // 當長度達到常見車牌長度時更新主顯示
        if (cleanText.length >= 5 && cleanText.length <= 8) {
            plateDisplay.innerText = cleanText;
            confirmBtn.style.display = "block";
        }
    } catch (e) {
        console.error(e);
    }

    // 每 0.8 秒執行一次辨識，兼顧效能與反應速度
    setTimeout(processFrame, 800);
}

confirmBtn.addEventListener('click', () => {
    alert("確認號碼：" + plateDisplay.innerText);
});

startBtn.addEventListener('click', initCamera);
