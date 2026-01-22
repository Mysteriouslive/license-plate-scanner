const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status');
const video = document.getElementById('video');
const snapCanvas = document.getElementById('snap-preview');
const calcCanvas = document.getElementById('calc-canvas');
const plateDisplay = document.getElementById('plate-number');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const runAiBtn = document.getElementById('runAiBtn');
const retryBtn = document.getElementById('retryBtn');

let cvReady = false;

// 1. 監控 OpenCV 載入
function onCvLoaded() {
    cvReady = true;
    updateProgress(100, "系統就緒");
    if(video.srcObject) captureBtn.disabled = false;
}

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
        // 鏡頭啟動後，若 CV 也好了就開啟捕捉
        if(cvReady) captureBtn.disabled = false;
        statusText.innerText = "相機已啟動";
    } catch (err) { alert("無法開啟相機，請檢查 HTTPS 設定"); }
});

// 3. 高可靠性「截圖定格」：使用 Canvas2D 繪圖
captureBtn.addEventListener('click', () => {
    const sCtx = snapCanvas.getContext('2d');
    
    // 計算視訊裁切區域 (對齊藍框位置)
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.3;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;

    snapCanvas.width = 600;
    snapCanvas.height = 300;
    
    // 直接用 2D context 繪製，成功率最高
    sCtx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
    
    snapCanvas.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
    statusText.innerText = "定格成功，請確認清晰度";
});

// 4. 按下確認後才執行 OpenCV 校正與 Tesseract 辨識
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateProgress(10, "正在執行水平校正...");

    // 使用 OpenCV 進行角度校正與二值化 (解決 9/3 問題)
    let src = cv.imread(snapCanvas);
    let dst = new cv.Mat();
    
    // 透視變換模擬水平拉直
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(src, dst, M, new cv.Size(600, 300));

    // 強度二值化
    cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY);
    cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    
    // 寫回畫布供辨識
    cv.imshow(snapCanvas, dst);

    updateProgress(40, "辨識文字中...");

    try {
        const result = await Tesseract.recognize(snapCanvas, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    updateProgress(40 + Math.round(m.progress * 60), `進度: ${Math.round(m.progress * 100)}%`);
                }
            },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        plateDisplay.innerText = txt || "FAIL";
        plateDisplay.style.color = txt ? "#34C759" : "red";
        
        if(txt) window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識成功 ${txt}`));
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
    plateDisplay.style.color = "white";
    updateProgress(100, "重新就緒");
});
