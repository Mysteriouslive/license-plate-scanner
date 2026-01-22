const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const plateDisplay = document.getElementById('plate-number');
const statusText = document.getElementById('status');

// 啟動相機
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        video.srcObject = stream;
    } catch (err) {
        statusText.innerText = "相機啟動失敗";
    }
}

// 執行辨識
async function recognize() {
    statusText.innerText = "辨識中...";
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // 進行 OCR 辨識 (限定字元集以提高準確度)
    const { data: { text } } = await Tesseract.recognize(canvas, 'eng', {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
    });

    // 簡單正則表達式過濾 (例如: ABC-1234)
    const match = text.match(/[A-Z0-9-]{5,8}/g);
    if (match) {
        plateDisplay.innerText = match[0];
        statusText.innerText = "辨識成功！";
    } else {
        statusText.innerText = "未偵測到，重試中...";
        setTimeout(recognize, 500);
    }
}

startBtn.addEventListener('click', () => {
    initCamera();
    recognize();
});
