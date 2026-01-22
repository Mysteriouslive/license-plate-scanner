const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status');
const video = document.getElementById('video');
const snapCanvas = document.getElementById('snap-preview');
const plateDisplay = document.getElementById('plate-number');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const runAiBtn = document.getElementById('runAiBtn');
const retryBtn = document.getElementById('retryBtn');

let cvReady = false;

function onCvReady() {
    cvReady = true;
    updateStatus(100, "系統就緒");
    if (video.srcObject) captureBtn.disabled = false;
}

function updateStatus(per, txt) {
    progressBar.style.width = per + "%";
    if (txt) statusText.innerText = txt;
}

startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 1280 } });
        video.srcObject = stream;
        startBtn.style.display = "none";
        if (cvReady) captureBtn.disabled = false;
        document.getElementById('info').innerText = "對準車牌後按下定格";
    } catch (err) { alert("請檢查 HTTPS 權限"); }
});

// 1. 定格畫面
captureBtn.addEventListener('click', () => {
    const ctx = snapCanvas.getContext('2d');
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.3;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;
    
    snapCanvas.width = 600; snapCanvas.height = 300;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
    
    snapCanvas.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
});

// 2. 水平化 + 字母黑化加深 + 辨識
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateStatus(20, "執行黑化加深處理...");

    let src = cv.imread(snapCanvas);
    let dst = new cv.Mat();

    // 水平平面化校正
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(src, dst, M, new cv.Size(600, 300));

    // --- 關鍵步驟：讓英文與數字變成黑色，背景反白 ---
    cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY);
    // 使用自適應二值化 (Adaptive Threshold)
    // 參數 15 是區域大小，12 是減去的常數。數值越大，文字會越黑、筆畫越結實。
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 15, 12);
    
    // 顯示校正加深後的黑白圖，讓你確認 9 是否封閉
    cv.imshow(snapCanvas, dst);

    updateStatus(50, "啟動 AI 文字分析...");
    try {
        const result = await Tesseract.recognize(snapCanvas, 'eng', {
            logger: m => { if (m.status === 'recognizing text') updateStatus(50 + (m.progress * 50), `辨識中: ${Math.round(m.progress * 100)}%`); },
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
    snapCanvas.style.display = "none";
    retryBtn.style.display = "none";
    runAiBtn.style.display = "none";
    runAiBtn.disabled = false;
    captureBtn.style.display = "block";
    plateDisplay.innerText = "----";
    updateStatus(100, "重新就緒");
});
