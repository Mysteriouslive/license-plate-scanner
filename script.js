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

// 【重新加入】台灣機車車牌規則判斷 (例如 ABC-1234 或 123-ABC)
const validateTaiwanMoto = (t) => {
    const rules = [
        /^[A-Z]{3}[0-9]{3,4}$/, // 新式機車 (三英+三/四數)
        /^[0-9]{3}[A-Z]{3}$/    // 舊式機車 (三數+三英)
    ];
    return rules.some(regex => regex.test(t));
};

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

// 2. 原始穩定定格：自動裁切並「撐滿」藍框
captureBtn.addEventListener('click', () => {
    const ctx = snap.getContext('2d');
    const sw = video.videoWidth * 0.6;
    const sh = video.videoHeight * 0.3;
    const sx = (video.videoWidth - sw) / 2;
    const sy = (video.videoHeight - sh) / 2.5;

    snap.width = 600;
    snap.height = 300;
    
    // 定格並密合撐滿
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
    
    snap.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
    infoText.innerText = "已自動密合，確認後開始辨識";
});

// 3. 確認辨識：執行平面化、字母黑化與規則驗證
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateStatus(20, "執行影像黑化加深...");

    let src = cv.imread(snap);
    let dst = new cv.Mat();
    
    // 影像黑化處理：字母變黑、背景反白
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 17, 13);
    cv.imshow(snap, dst); 

    updateStatus(50, "AI 規則比對中...");
    try {
        const result = await Tesseract.recognize(snap, 'eng', {
            logger: m => { if(m.status === 'recognizing text') updateStatus(50 + (m.progress * 50), "正在計算..."); },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        
        // 【核心】檢查是否符合台灣車牌規則
        if (validateTaiwanMoto(txt)) {
            plateDisplay.innerText = txt;
            plateDisplay.style.color = "#34C759";
            updateStatus(100, "辨識成功");
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(`號碼 ${txt.split('').join(' ')}`));
        } else {
            // 如果辨識結果不符規則，嘗試尋找字串中可能的車牌部分
            plateDisplay.innerText = "格式錯誤";
            plateDisplay.style.color = "orange";
            infoText.innerText = `辨識到: ${txt} (不符規則)`;
            updateStatus(100, "辨識失敗");
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
    plateDisplay.style.color = "white";
    updateStatus(100, "重新就緒");
});
