const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const plateDisplay = document.getElementById('plate-number');
const statusText = document.getElementById('status');
const startBtn = document.getElementById('startBtn');

async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: 1280, height: 720 },
            audio: false 
        });
        video.srcObject = stream;
        statusText.innerText = "掃描中...";
        statusText.style.background = "#007AFF";
        startBtn.style.display = "none";
        requestAnimationFrame(processFrame);
    } catch (err) {
        statusText.innerText = "請開啟相機權限";
    }
}

async function processFrame() {
    if (video.paused || video.ended) return;

    const ctx = canvas.getContext('2d');
    
    // 設定 Canvas 大小與影片一致
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 取得縮放比例（因為影片是被 object-fit: cover 的）
    // 這裡我們簡單計算框框在影片中的相對位置進行裁切
    const cropX = canvas.width * 0.25;
    const cropY = canvas.height * 0.4;
    const cropW = canvas.width * 0.5;
    const cropH = canvas.height * 0.2;

    // 將裁切後的影像畫到畫布上 (只畫掃描框範圍)
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

    // 每 1.5 秒執行一次 OCR 避免過載
    try {
        const result = await Tesseract.recognize(canvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
        });

        const match = result.data.text.match(/[A-Z0-9-]{5,8}/g);
        if (match) {
            plateDisplay.innerText = match[0];
            plateDisplay.style.color = "#00ff88";
        }
    } catch (e) {
        console.error(e);
    }

    setTimeout(processFrame, 1500);
}

startBtn.addEventListener('click', initCamera);
