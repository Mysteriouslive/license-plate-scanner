const video = document.getElementById('video');
const snapCanvas = document.getElementById('snap-preview');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const runAiBtn = document.getElementById('runAiBtn');
const retryBtn = document.getElementById('retryBtn');
const statusText = document.getElementById('status');

let cvReady = false;
function onCvReady() { cvReady = true; statusText.innerText = "系統就緒"; }

startBtn.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 1280 } });
    video.srcObject = stream;
    startBtn.style.display = "none";
    captureBtn.disabled = !cvReady;
});

// 截圖並執行「水平密合」校正
captureBtn.addEventListener('click', () => {
    if (!cvReady) return;
    
    // 1. 取得原始畫面並裁切
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.3;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;
    
    let src = cv.imread(video);
    let roi = src.roi(new cv.Rect(sx, sy, sw, sh));
    let dst = new cv.Mat();
    let dsize = new cv.Size(600, 300);

    // 2. 定義透視變換點 (將裁切區域強行拉伸為 600x300 的矩形)
    // 這一步能將歪斜的角度「拉平」
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0, sw, 0, sw, sh, 0, sh
    ]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0, 600, 0, 600, 300, 0, 300
    ]);

    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(roi, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    // 3. 執行二值化（黑白化）讓字體更明顯
    cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

    // 顯示結果
    cv.imshow(snapCanvas, dst);
    snapCanvas.style.display = "block";
    
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";

    // 釋放記憶體
    src.delete(); roi.delete(); dst.delete(); M.delete(); srcPts.delete(); dstPts.delete();
});

runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    const result = await Tesseract.recognize(snapCanvas, 'eng', {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: '7'
    });
    let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
    plateDisplay.innerText = txt || "FAIL";
    plateDisplay.style.color = txt ? "#34C759" : "red";
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
});
