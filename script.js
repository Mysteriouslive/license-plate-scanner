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

// --- 0. 載入與規則設定 ---

// 台灣機車車牌規則驗證
const validateTaiwanMoto = (t) => {
    const rules = [
        /^[A-Z]{3}[0-9]{3,4}$/, // 新式 (ABC-1234)
        /^[0-9]{3}[A-Z]{3}$/    // 舊式 (123-ABC)
    ];
    return rules.some(r => r.test(t));
};

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

// --- 1. 啟動鏡頭 ---
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1280 } } 
        });
        video.srcObject = stream;
        startBtn.style.display = "none";
        // 只有當 OpenCV 準備好且鏡頭開啟，才解鎖截圖鍵
        if (cvReady) captureBtn.disabled = false;
        infoText.innerText = "請對準車牌後按下定格";
    } catch (e) { alert("無法啟動相機，請檢查 HTTPS 或權限"); }
});

// --- 2. 截圖定格 (原生 Canvas) ---
// 不使用 OpenCV，確保手機不會卡死，並自動撐滿框框
captureBtn.addEventListener('click', () => {
    const ctx = snap.getContext('2d');
    
    // 計算藍框在影片中的相對位置
    const sw = video.videoWidth * 0.6;
    const sh = video.videoHeight * 0.3;
    const sx = (video.videoWidth - sw) / 2;
    const sy = (video.videoHeight - sh) / 2.5;

    // 設定畫布為標準 600x300 (自動密合)
    snap.width = 600;
    snap.height = 300;
    
    // 執行繪製
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
    
    // UI 切換
    snap.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
    infoText.innerText = "已定格，確認清晰後辨識";
});

// --- 3. 影像處理與辨識 ---
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateStatus(20, "執行水平校正與黑化...");

    let src = cv.imread(snap);
    let dst = new cv.Mat();
    
    // A. 水平平面化 (透視變換)
    // 強制將歪斜的圖片拉成正長方形
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(src, dst, M, new cv.Size(600, 300));

    // B. 自適應二值化 (黑白強化)
    // 參數 17, 13 是針對車牌調教過的，能讓字體變黑加粗
    cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 17, 13);
    
    // 顯示處理後的黑白圖
    cv.imshow(snap, dst);

    updateStatus(50, "AI 讀取中...");
    try {
        const result = await Tesseract.recognize(snap, 'eng', {
            logger: m => { if(m.status === 'recognizing text') updateStatus(50 + (m.progress * 50), "分析中..."); },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7' // 單行文字模式
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        
        // 規則驗證
        if (validateTaiwanMoto(txt)) {
            plateDisplay.innerText = txt;
            plateDisplay.style.color = "#34C759";
            updateStatus(100, "辨識成功");
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(`號碼 ${txt.split('').join(' ')}`));
        } else {
            plateDisplay.innerText = txt || "FAIL";
            plateDisplay.style.color = "orange";
            infoText.innerText = "格式不符，請重試";
            updateStatus(100, "辨識結束 (格式不符)");
        }
    } catch (e) { console.error(e); }

    // 釋放記憶體
    src.delete(); dst.delete(); M.delete(); srcPts.delete(); dstPts.delete();
    runAiBtn.style.display = "none";
});

// --- 4. 重試機制 ---
retryBtn.addEventListener('click', () => {
    snap.style.display = "none";
    retryBtn.style.display = "none";
    runAiBtn.style.display = "none";
    runAiBtn.disabled = false;
    captureBtn.style.display = "block";
    plateDisplay.innerText = "----";
    plateDisplay.style.color = "white";
    updateStatus(100, "系統就緒");
});
