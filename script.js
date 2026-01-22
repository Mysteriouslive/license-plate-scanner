const video = document.getElementById('video');
const snap = document.getElementById('snap-preview');
const buffer = document.getElementById('buffer-canvas');
const progress = document.getElementById('progress-fill');
const statusText = document.getElementById('status');
const plateDisplay = document.getElementById('plate-number');
const infoText = document.getElementById('info');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const runAiBtn = document.getElementById('runAiBtn');
const retryBtn = document.getElementById('retryBtn');

let cvReady = false;

function cvLoaded() {
    cvReady = true;
    updateStatus(100, "系統就緒");
    if(video.srcObject) captureBtn.disabled = false;
}
function cvError() { updateStatus(0, "載入失敗，請檢查網路"); }

function updateStatus(per, txt) {
    progress.style.width = per + "%";
    if(txt) statusText.innerText = txt;
}

startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 1280 } });
        video.srcObject = stream;
        startBtn.style.display = "none";
        if(cvReady) captureBtn.disabled = false;
        infoText.innerText = "對準後按定格";
    } catch (e) { alert("請使用 HTTPS 環境"); }
});

// 【重點】截圖定格：使用原生 drawImage 確保 100% 觸發
captureBtn.addEventListener('click', () => {
    const sCtx = snap.getContext('2d');
    
    // 1. 計算裁切比例 (對應藍色框框的位置)
    const sw = video.videoWidth * 0.6;
    const sh = video.videoHeight * 0.3;
    const sx = (video.videoWidth - sw) / 2;
    const sy = (video.videoHeight - sh) / 2.5;

    // 2. 設置畫布尺寸並「撐滿」
    snap.width = 600;
    snap.height = 300;
    
    // 將視訊局部拉伸並繪製到 600x300 的畫布，實現「密合撐滿」
    sCtx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
    
    // 3. 切換 UI
    snap.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
    infoText.innerText = "已密合定格，請確認清晰度";
});

// 【重點】水平化 + 字母黑化加深
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateStatus(20, "影像水平化與加深中...");

    let src = cv.imread(snap);
    let dst = new cv.Mat();
    
    // A. 水平化校正
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(src, dst, M, new cv.Size(600, 300));

    // B. 字母黑化背景反白
    cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 17, 14);
    
    cv.imshow(snap, dst); // 更新顯示黑化後的影像

    updateStatus(50, "AI 辨識中...");
    try {
        const result = await Tesseract.recognize(snap, 'eng', {
            logger: m => { if(m.status === 'recognizing text') updateStatus(50 + (m.progress * 50), "分析中..."); },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        plateDisplay.innerText = txt || "FAIL";
        plateDisplay.style.color = txt ? "#34C759" : "red";
        updateStatus(100, txt ? "辨識完成" : "辨識失敗");
    } catch (e) { console.error(e); }

    src.delete(); dst.delete(); M.delete(); srcPts.delete(); dstPts.delete();
    runAiBtn.style.display = "none";
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
