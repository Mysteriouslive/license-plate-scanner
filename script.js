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

// 1. 進度條更新與 OpenCV 監控
function updateProgress(per, text) {
    progressBar.style.width = per + "%";
    if (text) statusText.innerText = text;
}

function cvLoaded() {
    cvReady = true;
    updateProgress(100, "引擎就緒");
    if(video.srcObject) captureBtn.disabled = false;
}

// 2. 啟動鏡頭
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1280 } } 
        });
        video.srcObject = stream;
        startBtn.style.display = "none";
        if(cvReady) captureBtn.disabled = false;
        previewText.innerText = "請對準車牌後按下截圖";
    } catch (err) { alert("無法開啟相機，請檢查 HTTPS 設定"); }
});

// 3. 截圖並水平校正密合
captureBtn.addEventListener('click', () => {
    if (!cvReady) return;
    
    // 計算裁切座標 (對準 UI 藍框位置)
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.3;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;

    let src = cv.imread(video);
    let roi = src.roi(new cv.Rect(sx, sy, sw, sh));
    let dst = new cv.Mat();
    
    // 透視校正：強行拉平並密合至 600x300
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, sw, 0, sw, sh, 0, sh]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(roi, dst, M, new cv.Size(600, 300), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    // 影像強化：黑白二值化解決 9/3 誤認
    cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY);
    cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    cv.imshow(snapCanvas, dst);
    snapCanvas.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";

    // 釋放記憶體避免手機閃退
    src.delete(); roi.delete(); dst.delete(); M.delete(); srcPts.delete(); dstPts.delete();
});

// 4. 辨識與進度追蹤
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateProgress(0, "正在分析...");

    try {
        const result = await Tesseract.recognize(snapCanvas, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    updateProgress(Math.round(m.progress * 100), `辨識中: ${Math.round(m.progress * 100)}%`);
                }
            },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        plateDisplay.innerText = txt || "FAIL";
        plateDisplay.style.color = txt ? "#34C759" : "#FF3B30";
        updateProgress(100, txt ? "辨識成功" : "辨識失敗");
        if(txt) window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識結果 ${txt}`));
    } catch (e) { updateProgress(0, "出錯了"); }
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
