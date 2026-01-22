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

function cvLoaded() {
    cvReady = true;
    updateStatus(100, "系統就緒");
    if (video.srcObject) captureBtn.disabled = false;
}

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
    } catch (e) { alert("無法啟動鏡頭，請檢查 HTTPS"); }
});

// 2. 最原始的定格方法：直接用 Canvas 繪製，不經過 OpenCV 確保不卡頓
captureBtn.addEventListener('click', () => {
    const ctx = snap.getContext('2d');
    
    // 計算視訊裁切座標 (藍色框框的位置)
    const sw = video.videoWidth * 0.6;
    const sh = video.videoHeight * 0.3;
    const sx = (video.videoWidth - sw) / 2;
    const sy = (video.videoHeight - sh) / 2.5;

    // 設置畫布尺寸為 600x300 (自動密合撐滿)
    snap.width = 600;
    snap.height = 300;
    
    // 執行原生地繪製 (100% 成功觸發)
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
    
    snap.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
    infoText.innerText = "已定格，確認後開始辨識";
});

// 3. 確認辨識：此時才執行平面化與字母黑化
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateStatus(20, "執行平面化與字母加深...");

    let src = cv.imread(snap);
    let dst = new cv.Mat();
    
    // 平面化與黑化加深
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 17, 13);
    
    cv.imshow(snap, dst); // 更新畫面上看到的結果

    updateStatus(50, "啟動 AI 辨識中...");
    try {
        const result = await Tesseract.recognize(snap, 'eng', {
            logger: m => { if(m.status === 'recognizing text') updateStatus(50 + (m.progress * 50), "正在計算..."); },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        plateDisplay.innerText = txt || "FAIL";
        plateDisplay.style.color = txt ? "#34C759" : "red";
        updateStatus(100, txt ? "辨識完成" : "辨識失敗");
        
        if (txt) {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(`號碼 ${txt.split('').join(' ')}`));
        }
    } catch (e) { console.error(e); }

    src.delete(); dst.delete();
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
