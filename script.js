const video = document.getElementById('video');
const snapCanvas = document.getElementById('snap-preview');
const plateDisplay = document.getElementById('plate-number');
const infoText = document.getElementById('info');
const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const runAiBtn = document.getElementById('runAiBtn');
const retryBtn = document.getElementById('retryBtn');

let cvReady = false;

function onCvReady() {
    cvReady = true;
    updateProgress(100, "系統就緒");
    if (video.srcObject) captureBtn.disabled = false;
}

function updateProgress(per, text) {
    progressBar.style.width = per + "%";
    if (text) statusText.innerText = text;
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
    } catch (err) { alert("無法存取相機，請檢查 HTTPS 設定"); }
});

// 2. 截圖定格並「自動密合」與「水平校正」
captureBtn.addEventListener('click', () => {
    if (!cvReady) return;
    
    // 計算視訊中的裁切座標 (對齊 UI 框框位置)
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.35;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.3;

    // A. 先用 OpenCV 抓取並執行「透視變換」
    let src = cv.imread(video);
    let rect = new cv.Rect(sx, sy, sw, sh);
    let roi = src.roi(rect);
    let dst = new cv.Mat();
    
    // 定義目標尺寸 (600x300)，這就是我們要「密合撐滿」的規格
    let dsize = new cv.Size(600, 300);
    
    // 設定來源四角點與目標四角點，強制拉平成水平矩形
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, sw, 0, sw, sh, 0, sh]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    
    // 執行變換：這步會讓車牌自動放大並「撐滿」畫布
    cv.warpPerspective(roi, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    // B. 顯示在 snapCanvas (此時使用者會看到車牌變大、變正，且剛好填滿藍框)
    snapCanvas.width = 600;
    snapCanvas.height = 300;
    cv.imshow(snapCanvas, dst);
    
    snapCanvas.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
    infoText.innerText = "已自動密合校正，確認後辨識";

    // 釋放暫存記憶體
    src.delete(); roi.delete(); dst.delete(); M.delete(); srcPts.delete(); dstPts.delete();
});

// 3. 文字黑化加深 + AI 辨識
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateProgress(30, "執行黑化加深...");

    let src = cv.imread(snapCanvas);
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY);
    // 自適應二值化：字體黑色加深，背景徹底反白
    cv.adaptiveThreshold(src, src, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 17, 13);
    cv.imshow(snapCanvas, src);

    updateProgress(50, "AI 辨識中...");
    try {
        const result = await Tesseract.recognize(snapCanvas, 'eng', {
            logger: m => { if (m.status === 'recognizing text') updateProgress(50 + (m.progress * 50), `辨識中: ${Math.round(m.progress * 100)}%`); },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        plateDisplay.innerText = txt || "FAIL";
        plateDisplay.style.color = txt ? "#34C759" : "red";
        updateProgress(100, txt ? "辨識完成" : "辨識失敗");
        if(txt) window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識號碼 ${txt.split('').join(' ')}`));
    } catch (e) { console.error(e); }

    src.delete();
    runAiBtn.style.display = "none";
});

retryBtn.addEventListener('click', () => {
    snapCanvas.style.display = "none";
    retryBtn.style.display = "none";
    runAiBtn.style.display = "none";
    runAiBtn.disabled = false;
    captureBtn.style.display = "block";
    plateDisplay.innerText = "----";
    updateProgress(100, "重新就緒");
});
