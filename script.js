const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status');
const video = document.getElementById('video');
const snapCanvas = document.getElementById('snap-preview');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const runAiBtn = document.getElementById('runAiBtn');
const retryBtn = document.getElementById('retryBtn');

let cvReady = false;

// 1. OpenCV 載入監控
function cvLoaded() {
    cvReady = true;
    updateProgress(100, "系統就緒");
    startBtn.disabled = false;
}

function updateProgress(per, text) {
    progressBar.style.width = per + "%";
    if (text) statusText.innerText = text;
}

// 2. 啟動鏡頭
startBtn.addEventListener('click', async () => {
    try {
        updateProgress(20, "啟動鏡頭中...");
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: 1280 } 
        });
        video.srcObject = stream;
        updateProgress(100, "鏡頭已就緒");
        startBtn.style.display = "none";
        captureBtn.disabled = !cvReady;
    } catch (err) { alert("請確保使用 HTTPS 環境"); }
});

// 3. 截圖與水平校正
captureBtn.addEventListener('click', () => {
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.3;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;

    let src = cv.imread(video);
    let roi = src.roi(new cv.Rect(sx, sy, sw, sh));
    let dst = new cv.Mat();
    
    // 透視校正拉直
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, sw, 0, sw, sh, 0, sh]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(roi, dst, M, new cv.Size(600, 300), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    // 影像強化
    cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY);
    cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    cv.imshow(snapCanvas, dst);
    snapCanvas.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
    previewText.innerText = "已水平校正，請確認清晰度";

    src.delete(); roi.delete(); dst.delete(); M.delete(); srcPts.delete(); dstPts.delete();
});

// 4. 辨識與進度追蹤
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateProgress(0, "啟動 AI 辨識...");

    try {
        // Tesseract 內部進度監控
        const result = await Tesseract.recognize(snapCanvas, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    updateProgress(Math.round(m.progress * 100), `正在辨識: ${Math.round(m.progress * 100)}%`);
                }
            },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        plateDisplay.innerText = txt || "FAIL";
        plateDisplay.style.color = txt ? "#34C759" : "#FF3B30";
        updateProgress(100, txt ? "辨識成功" : "辨識失敗");
        
        if (txt) window.speechSynthesis.speak(new SpeechSynthesisUtterance(`號碼為 ${txt.split('').join(' ')}`));
    } catch (e) {
        updateProgress(0, "辨識出錯");
    }
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
    updateProgress(100, "重新對準中");
});
