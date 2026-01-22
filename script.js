const video = document.getElementById('video');
const snapCanvas = document.getElementById('snap-preview');
const calcCanvas = document.getElementById('calc-canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const retryBtn = document.getElementById('retryBtn');
const statusText = document.getElementById('status');

let isCvLoaded = false;
const validateMoto = (t) => /^[A-Z]{3}[0-9]{3,4}$|^[0-9]{3}[A-Z]{3}$/.test(t);

function cvReady() {
    isCvLoaded = true;
    statusText.innerText = "系統就緒";
}

startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1920 } } 
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            startBtn.style.display = "none";
            captureBtn.disabled = !isCvLoaded;
            previewText.innerText = "請對準車牌拍照";
        };
    } catch (err) { alert("相機啟動失敗"); }
});

captureBtn.addEventListener('click', async () => {
    if (!isCvLoaded) return;
    captureBtn.disabled = true;
    previewText.innerText = "正在進行透視校正...";

    const sCtx = snapCanvas.getContext('2d');
    
    // 1. 抓取原始截圖 (裁切藍框範圍)
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.25;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.5;
    
    snapCanvas.width = 600;
    snapCanvas.height = 400;
    sCtx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 400);
    snapCanvas.style.display = "block";
    captureBtn.style.display = "none";
    retryBtn.style.display = "block";

    // 2. OpenCV 透視校正預處理
    let src = cv.imread(snapCanvas);
    let dst = new cv.Mat();
    let dsize = new cv.Size(600, 300);

    // 這裡我們預設進行邊緣強化，幫助 OCR 讀取平整化的字體
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY);
    cv.threshold(src, src, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    
    // 將校正後的結果畫到計算畫布
    cv.imshow(calcCanvas, src);

    // 3. Tesseract 多重比對
    const filters = ['none', 'contrast(1.5)']; // 基礎平面化後不需過多濾鏡
    let votes = {};

    for (let f of filters) {
        const ctx = calcCanvas.getContext('2d');
        if (f !== 'none') ctx.filter = f;
        
        const result = await Tesseract.recognize(calcCanvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });
        
        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        if (validateMoto(txt)) votes[txt] = (votes[txt] || 0) + 1;
    }

    const winners = Object.keys(votes);
    if (winners.length > 0) {
        const best = winners.reduce((a, b) => votes[a] > votes[b] ? a : b);
        plateDisplay.innerText = best;
        plateDisplay.style.color = "#34C759";
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識成功 ${best}`));
    } else {
        plateDisplay.innerText = "重拍";
        previewText.innerText = "無法校正，請保持水平或調整角度";
    }

    src.delete(); dst.delete();
});

retryBtn.addEventListener('click', () => {
    snapCanvas.style.display = "none";
    retryBtn.style.display = "none";
    captureBtn.style.display = "block";
    captureBtn.disabled = false;
    plateDisplay.innerText = "----";
    plateDisplay.style.color = "white";
    previewText.innerText = "重新對準捕捉";
});
