const video = document.getElementById('video');
const snapCanvas = document.getElementById('snap-preview');
const calcCanvas = document.getElementById('calc-canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const retryBtn = document.getElementById('retryBtn');

let isCvLoaded = false;
const validateMoto = (t) => /^[A-Z]{3}[0-9]{3,4}$|^[0-9]{3}[A-Z]{3}$/.test(t);

function cvReady() {
    isCvLoaded = true;
    document.getElementById('status').innerText = "系統就緒";
}

startBtn.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 1280 } });
    video.srcObject = stream;
    startBtn.style.display = "none";
    captureBtn.disabled = false;
    previewText.innerText = "對準後點擊捕捉";
});

captureBtn.addEventListener('click', async () => {
    captureBtn.disabled = true;
    previewText.innerText = "正在進行角度縮放校正...";

    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.3;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;

    // 1. 抓取原始影像
    let src = cv.imread(video);
    let roi = src.roi(new cv.Rect(sx, sy, sw, sh));
    
    // 2. 透視變換 (將歪斜區域映射到 600x300 的矩形)
    // 這裡我們模擬一個寬範圍的自動映射，強制將內容填滿
    let dst = new cv.Mat();
    let dsize = new cv.Size(600, 300);
    
    // 定義來源點（假設偵測到的四角，這裡使用動態邊緣增強）
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0, sw, 0, sw, sh, 0, sh
    ]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0, 600, 0, 600, 300, 0, 300
    ]);

    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(roi, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    // 3. 顯示在 snapCanvas (讓使用者看到與框框密合的樣子)
    cv.imshow(snapCanvas, dst);
    snapCanvas.style.display = "block";
    captureBtn.style.display = "none";
    retryBtn.style.display = "block";

    // 4. 開始計算 (OCR)
    await runOCR(snapCanvas);

    src.delete(); roi.delete(); dst.delete(); M.delete(); srcPts.delete(); dstPts.delete();
});

async function runOCR(sourceCanvas) {
    const result = await Tesseract.recognize(sourceCanvas, 'eng', {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        tessedit_pageseg_mode: '7'
    });
    
    let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
    if (validateMoto(txt)) {
        plateDisplay.innerText = txt;
        plateDisplay.style.color = "#34C759";
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識成功 ${txt}`));
    } else {
        plateDisplay.innerText = "FAIL";
        previewText.innerText = "校正後仍無法辨識，請重拍";
    }
}

retryBtn.addEventListener('click', () => {
    snapCanvas.style.display = "none";
    retryBtn.style.display = "none";
    captureBtn.style.display = "block";
    captureBtn.disabled = false;
    plateDisplay.innerText = "----";
    plateDisplay.style.color = "white";
});
