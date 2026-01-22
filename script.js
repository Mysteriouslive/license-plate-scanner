const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status');
const video = document.getElementById('video');
const snapCanvas = document.getElementById('snap-preview');
const plateDisplay = document.getElementById('plate-number');
const infoText = document.getElementById('info');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const runAiBtn = document.getElementById('runAiBtn');
const retryBtn = document.getElementById('retryBtn');

let cvReady = false;

// 1. 引擎監測
function onCvLoaded() {
    cvReady = true;
    updateProgress(100, "系統就緒");
    if (video.srcObject) captureBtn.disabled = false;
}
function onCvError() { updateProgress(0, "引擎載入失敗，請檢查連線"); }

function updateProgress(per, text) {
    progressBar.style.width = per + "%";
    if (text) statusText.innerText = text;
}

// 2. 啟動鏡頭
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1280 } } 
        });
        video.srcObject = stream;
        startBtn.style.display = "none";
        // 鏡頭啟動後，只要 OpenCV 好了，捕捉鍵就亮起
        if (cvReady) captureBtn.disabled = false;
        infoText.innerText = "請對準車牌後按下定格";
    } catch (err) { alert("無法開啟相機，請使用 HTTPS 環境"); }
});

// 3. 截圖定格 (使用原生 2D 繪圖，不依賴 OpenCV，確保 100% 定格)
captureBtn.addEventListener('click', () => {
    const ctx = snapCanvas.getContext('2d');
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.3;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;

    snapCanvas.width = 600;
    snapCanvas.height = 300;
    // 直接將視訊局部裁切並填滿畫布
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
    
    snapCanvas.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
    infoText.innerText = "已定格，確認清晰後點擊辨識";
});

// 4. 平面化 + 字母加深 + 辨識
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateProgress(20, "執行平面化與字母加深...");

    // OpenCV 影像處理
    let src = cv.imread(snapCanvas);
    let dst = new cv.Mat();

    // --- 水平平面化 ---
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(src, dst, M, new cv.Size(600, 300));

    // --- 字母加深與反白處理 ---
    cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY);
    // 使用 adaptiveThreshold 讓文字變黑加深，背景反白
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 15, 12);
    
    // 顯示校正結果供用戶確認
    cv.imshow(snapCanvas, dst);

    updateProgress(50, "AI 文字辨識中...");
    try {
        const result = await Tesseract.recognize(snapCanvas, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    updateProgress(50 + Math.round(m.progress * 50), `辨識中: ${Math.round(m.progress * 100)}%`);
                }
            },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        plateDisplay.innerText = txt || "FAIL";
        plateDisplay.style.color = txt ? "#34C759" : "red";
        updateProgress(100, txt ? "辨識完成" : "辨識失敗");
        
        if (txt) window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識結果 ${txt.split('').join(' ')}`));
    } catch (e) { console.error(e); updateProgress(0, "辨識過程發生錯誤"); }

    // 釋放記憶體
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
    plateDisplay.style.color = "white";
    updateProgress(100, "系統就緒");
});
