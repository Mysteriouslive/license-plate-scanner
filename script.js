const video = document.getElementById('video');
const snapCanvas = document.getElementById('snap-preview');
const calcCanvas = document.getElementById('calc-canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const retryBtn = document.getElementById('retryBtn');
const statusText = document.getElementById('status');

let cvReady = false;
const validateMoto = (t) => /^[A-Z]{3}[0-9]{3,4}$|^[0-9]{3}[A-Z]{3}$/.test(t);

// 引擎載入檢查
function onOpenCvReady() {
    cvReady = true;
    statusText.innerText = "系統就緒";
}
function onOpenCvError() { statusText.innerText = "引擎載入失敗，請檢查網路"; }

// 1. 啟動鏡頭
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1280 } } 
        });
        video.srcObject = stream;
        startBtn.style.display = "none";
        captureBtn.disabled = !cvReady; // 只有引擎載入完才啟用捕捉
        previewText.innerText = "請對準車牌後拍照";
    } catch (err) { alert("相機啟動失敗，請確保使用 HTTPS"); }
});

// 2. 捕捉、透視校正與縮放密合
captureBtn.addEventListener('click', async () => {
    if (!cvReady) { alert("引擎尚未就緒，請稍候"); return; }
    
    captureBtn.disabled = true;
    previewText.innerText = "正在進行透視校正與密合...";

    // A. 抓取原始截圖 (裁切藍框範圍)
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.25;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.5;

    let src = cv.imread(video);
    let roi = src.roi(new cv.Rect(sx, sy, sw, sh));
    
    // B. 透視變換：強行將裁切區域「拉伸密合」至 600x300 的矩形
    let dst = new cv.Mat();
    let dsize = new cv.Size(600, 300);
    
    // 定義來源與目標座標（實現拉伸與對齊）
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, sw, 0, sw, sh, 0, sh]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);

    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(roi, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    // C. 顯示校正後的畫面 (密合至藍框)
    cv.imshow(snapCanvas, dst);
    snapCanvas.style.display = "block";
    captureBtn.style.display = "none";
    retryBtn.style.display = "block";

    // D. 執行 OCR
    try {
        const result = await Tesseract.recognize(snapCanvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });
        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        if (validateMoto(txt)) {
            plateDisplay.innerText = txt;
            plateDisplay.style.color = "#34C759";
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識成功 ${txt}`));
            previewText.innerText = "辨識完成";
        } else {
            plateDisplay.innerText = "FAIL";
            previewText.innerText = "無法辨識，請重拍";
        }
    } catch (e) { console.error(e); }

    // 釋放記憶體
    src.delete(); roi.delete(); dst.delete(); M.delete(); srcPts.delete(); dstPts.delete();
});

retryBtn.addEventListener('click', () => {
    snapCanvas.style.display = "none";
    retryBtn.style.display = "none";
    captureBtn.style.display = "block";
    captureBtn.disabled = false;
    plateDisplay.innerText = "----";
    plateDisplay.style.color = "white";
    previewText.innerText = "重新對準後捕捉";
});
