const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const confirmBtn = document.getElementById('confirmBtn');
const startBtn = document.getElementById('startBtn');
const statusText = document.getElementById('status');

let isScanning = false;

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
    }
}

async function processFrame() {
    if (!isScanning) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 200;

    // 針對單頁佈局調整擷取座標，擷取視訊流中央區域
    const sourceX = video.videoWidth * 0.25;
    const sourceY = video.videoHeight * 0.35;
    const sourceW = video.videoWidth * 0.5;
    const sourceH = video.videoHeight * 0.3;

    ctx.drawImage(video, sourceX, sourceY, sourceW, sourceH, 0, 0, 400, 200);
    ctx.filter = 'contrast(1.6) grayscale(1)';

    try {
        const result = await Tesseract.recognize(canvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        });

        let cleanText = result.data.text.replace(/[^A-Z0-9]/g, "");
        previewText.innerText = "偵測中: " + (cleanText || "...");

        if (cleanText.length >= 5 && cleanText.length <= 8) {
            plateDisplay.innerText = cleanText;
            confirmBtn.style.display = "block";
        }
    } catch (e) {}

    setTimeout(processFrame, 700);
}

confirmBtn.addEventListener('click', () => {
    alert("已確認：" + plateDisplay.innerText);
});

startBtn.addEventListener('click', initCamera);
