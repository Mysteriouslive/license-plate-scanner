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

function onCvLoaded() {
    cvReady = true;
    statusText.innerText = "系統就緒";
}

// 1. 啟動相機
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1920 } } 
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            startBtn.style.display = "none";
            captureBtn.disabled = !cvReady;
            previewText.innerText = "請對準車牌後按下捕捉";
        };
    } catch (err) { alert("相機開啟失敗"); }
});

// 2. 捕捉與角度校正辨識
captureBtn.addEventListener('click', async () => {
    const sCtx = snapCanvas.getContext('2d');
    
    // 定位視訊流中的裁切範圍
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.25;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.5;

    snapCanvas.width = 600;
    snapCanvas.height = 300;
    sCtx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
    snapCanvas.style.display = "block";
    captureBtn.style.display = "none";
    retryBtn.style.display = "block";
    previewText.innerText = "正在進行校正與辨識...";

    // --- OpenCV 影像校正流程 ---
    let src = cv.imread(snapCanvas);
    let gray = new cv.Mat();
    
    // 轉灰階並執行自適應二值化 (解決 9 認成 3 的關鍵)
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.adaptiveThreshold(gray, gray, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
    
    // 將校正後影像顯示在計算畫布
    cv.imshow(calcCanvas, gray);

    // --- Tesseract 多重採樣 ---
    try {
        const result = await Tesseract.recognize(calcCanvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });

        let cleanText = result.data.text.replace(/[^A-Z0-9]/g, "");
        
        if (validateMoto(cleanText)) {
            plateDisplay.innerText = cleanText;
            plateDisplay.style.color = "#34C759";
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識成功 ${cleanText.split('').join(' ')}`));
            previewText.innerText = "辨識完成";
        } else {
            plateDisplay.innerText = "FAIL";
            previewText.innerText = "格式不符，請調整角度重拍";
        }
    } catch (e) { console.error(e); }

    src.delete(); gray.delete();
});

// 3. 重試
retryBtn.addEventListener('click', () => {
    snapCanvas.style.display = "none";
    retryBtn.style.display = "none";
    captureBtn.style.display = "block";
    captureBtn.disabled = false;
    plateDisplay.innerText = "----";
    plateDisplay.style.color = "white";
    previewText.innerText = "重新對準後捕捉";
});
