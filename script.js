const video = document.getElementById('video');
const snap = document.getElementById('snap-preview');
const progress = document.getElementById('progress-fill');
const statusText = document.getElementById('status');
const plateDisplay = document.getElementById('plate-number');
const infoText = document.getElementById('info');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const runAiBtn = document.getElementById('runAiBtn');
const retryBtn = document.getElementById('retryBtn');

let cvReady = false;

// 引擎載入控制
function onCvReady() {
    cvReady = true;
    updateStatus(100, "系統就緒");
    if (video.srcObject) captureBtn.disabled = false;
}
function onCvError() { updateStatus(0, "引擎載入失敗"); }

function updateStatus(per, txt) {
    progress.style.width = per + "%";
    if (txt) statusText.innerText = txt;
}

// 1. 啟動鏡頭
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1280 } } 
        });
        video.srcObject = stream;
        startBtn.style.display = "none";
        if (cvReady) captureBtn.disabled = false;
        infoText.innerText = "請對準車牌後按下定格";
    } catch (e) { alert("無法啟動鏡頭，請檢查 HTTPS 權限"); }
});

// 2. 截圖定格：改用最底層 Canvas 指令，確保「點擊必觸發」
captureBtn.addEventListener('click', () => {
    const ctx = snap.getContext('2d');
    
    // 計算視訊裁切座標 (對齊藍框位置)
    const sw = video.videoWidth * 0.6;
    const sh = video.videoHeight * 0.3;
    const sx = (video.videoWidth - sw) / 2;
    const sy = (video.videoHeight - sh) / 2.5;

    // 設置畫布尺寸為 600x300 (實現縮放密合)
    snap.width = 600;
    snap.height = 300;
    
    // 執行原生地定格繪製 (此步驟不依賴 OpenCV，極快且不卡頓)
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
    
    snap.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
    infoText.innerText = "定格成功，請確認清晰度";
});

// 3. 確認後：水平化 + 黑化加深 + 辨識
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateStatus(20, "正在執行水平化校正...");

    let src = cv.imread(snap);
    let dst = new cv.Mat();
    
    // --- 水平平面化 (透視校正) ---
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(src, dst, M, new cv.Size(600, 300));

    // --- 字母黑化 + 背景反白 (自適應二值化) ---
    updateStatus(40, "字母加深中...");
    cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 17, 13);
    
    cv.imshow(snap, dst); // 更新畫面上看到的結果

    updateStatus(60, "AI 文字辨識中...");
    try {
        const result = await Tesseract.recognize(snap, 'eng', {
            logger: m => { if(m.status === 'recognizing text') updateStatus(60 + (m.progress * 40), "分析中..."); },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        plateDisplay.innerText = txt || "FAIL";
        plateDisplay.style.color = txt ? "#34C759" : "red";
        updateStatus(100, txt ? "辨識完成" : "辨識失敗");
        
        if(txt) {
            const utterance = new SpeechSynthesisUtterance(`辨識結果 ${txt.split('').join(' ')}`);
            window.speechSynthesis.speak(utterance);
        }
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
