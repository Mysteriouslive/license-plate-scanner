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

// 台灣機車規則驗證
const validateTaiwanMoto = (t) => {
    const rules = [/^[A-Z]{3}[0-9]{3,4}$/, /^[0-9]{3}[A-Z]{3}$/];
    return rules.some(r => r.test(t));
};

function onCvReady() {
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
            video: { facingMode: "environment", width: { ideal: 1920 } } 
        });
        video.srcObject = stream;
        startBtn.style.display = "none";
        if (cvReady) captureBtn.disabled = false;
        infoText.innerText = "請對準車牌後按下定格";
    } catch (e) { alert("無法啟動相機，請檢查 HTTPS 或權限"); }
});

// 2. 原生截圖定格：解決沒反應問題，並強制「置中」裁切
captureBtn.addEventListener('click', () => {
    const ctx = snap.getContext('2d');
    
    // 計算視訊流中的「絕對中央」裁切位置
    const vW = video.videoWidth;
    const vH = video.videoHeight;
    
    // 依據 UI 框框 (260x110) 比例計算裁切範圍
    const cropWidth = vW * 0.65; 
    const cropHeight = cropWidth * (110 / 260);
    const sx = (vW - cropWidth) / 2;
    const sy = (vH - cropHeight) / 2; // 確保垂直置中

    snap.width = 600;
    snap.height = 300;
    
    // 執行原生地繪製定格 (100% 成功觸發)
    ctx.drawImage(video, sx, sy, cropWidth, cropHeight, 0, 0, 600, 300);
    
    snap.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
    infoText.innerText = "已定格並置中，確認清晰後辨識";
});

// 3. 文字黑化加深 + 辨識
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateStatus(20, "執行平面化與字母加深...");

    let src = cv.imread(snap);
    let dst = new cv.Mat();
    
    // A. 影像銳利化：加強邊緣對比
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
    let kernel = cv.matFromArray(3, 3, cv.CV_32F, [0, -1, 0, -1, 5, -1, 0, -1, 0]);
    cv.filter2D(dst, dst, cv.CV_8U, kernel);

    // B. 自適應二值化：字體極致黑化，背景反白
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 17, 13);
    
    cv.imshow(snap, dst); // 更新畫面上看到的黑化影像

    updateStatus(50, "啟動 AI 文字辨識...");
    try {
        const result = await Tesseract.recognize(snap, 'eng', {
            logger: m => { if(m.status === 'recognizing text') updateStatus(50 + (m.progress * 50), "分析中..."); },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        
        if (validateTaiwanMoto(txt)) {
            plateDisplay.innerText = txt;
            plateDisplay.style.color = "#34C759";
            updateStatus(100, "辨識成功");
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識結果 ${txt.split('').join(' ')}`));
        } else {
            plateDisplay.innerText = txt || "FAIL";
            plateDisplay.style.color = "orange";
            infoText.innerText = "格式不符，請對準重拍";
            updateStatus(100, "辨識失敗");
        }
    } catch (e) { console.error(e); }

    src.delete(); dst.delete(); kernel.delete();
    runAiBtn.style.display = "none";
});

retryBtn.addEventListener('click', () => {
    snap.style.display = "none";
    retryBtn.style.display = "none";
    runAiBtn.style.display = "none";
    runAiBtn.disabled = false;
    captureBtn.style.display = "block";
    plateDisplay.innerText = "----";
    plateDisplay.style.color = "white";
    updateStatus(100, "重新就緒");
});
