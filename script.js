const video = document.getElementById('video');
const snap = document.getElementById('snap-preview');
const plateDisplay = document.getElementById('plate-number');
const info = document.getElementById('info');
const progress = document.getElementById('progress-fill');
const statusText = document.getElementById('status');
const captureBtn = document.getElementById('captureBtn');
const runAiBtn = document.getElementById('runAiBtn');
const retryBtn = document.getElementById('retryBtn');

let cvReady = false;

function cvLoaded() {
    cvReady = true;
    updateStatus(100, "系統就緒");
    if(video.srcObject) captureBtn.disabled = false;
}

function updateStatus(per, txt) {
    progress.style.width = per + "%";
    if(txt) statusText.innerText = txt;
}

// 1. 啟動
document.getElementById('startBtn').addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 1280 } });
    video.srcObject = stream;
    document.getElementById('startBtn').style.display = "none";
    if(cvReady) captureBtn.disabled = false;
    info.innerText = "請對準車牌後拍照";
});

// 2. 截圖定格 (原生 Canvas2D，不卡頓)
captureBtn.addEventListener('click', () => {
    const ctx = snap.getContext('2d');
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.3;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;
    
    snap.width = 600; snap.height = 300;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
    
    snap.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
    info.innerText = "截圖完成，請確認是否清晰";
});

// 3. 辨識 (點擊後才載入 OpenCV 校正與 Tesseract)
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateStatus(20, "影像水平校正中...");
    
    // OpenCV 影像拉直與黑白強化
    let src = cv.imread(snap);
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(gray, gray, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
    cv.imshow(snap, gray); // 讓使用者看到校正後的黑白圖

    updateStatus(40, "辨識文字中...");
    
    const result = await Tesseract.recognize(snap, 'eng', {
        logger: m => { if(m.status === 'recognizing text') updateStatus(40 + (m.progress * 60), "正在計算..."); },
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: '7'
    });

    let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
    plateDisplay.innerText = txt || "FAIL";
    plateDisplay.style.color = txt ? "#34C759" : "red";
    updateStatus(100, "處理完成");
    
    src.delete(); gray.delete();
});

retryBtn.addEventListener('click', () => {
    snap.style.display = "none";
    retryBtn.style.display = "none";
    runAiBtn.style.display = "none";
    runAiBtn.disabled = false;
    captureBtn.style.display = "block";
    plateDisplay.innerText = "----";
    updateStatus(100, "重新就緒");
});
