const video = document.getElementById('video');
const snapCanvas = document.getElementById('snap-preview');
const calcCanvas = document.getElementById('calc-canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const retryBtn = document.getElementById('retryBtn');

const validateMoto = (t) => /^[A-Z]{3}[0-9]{3,4}$|^[0-9]{3}[A-Z]{3}$/.test(t);

// 1. 啟動鏡頭
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1920 } } 
        });
        video.srcObject = stream;
        startBtn.style.display = "none";
        captureBtn.disabled = false;
        captureBtn.style.background = "var(--accent)";
        previewText.innerText = "對準機車車牌後按下捕捉";
    } catch (err) { alert("無法開啟相機，請檢查 HTTPS 權限"); }
});

// 2. 捕捉並執行多重辨識
captureBtn.addEventListener('click', async () => {
    const sCtx = snapCanvas.getContext('2d');
    const cCtx = calcCanvas.getContext('2d');
    
    // 定格畫面
    snapCanvas.width = video.videoWidth;
    snapCanvas.height = video.videoHeight;
    sCtx.drawImage(video, 0, 0);
    snapCanvas.style.display = "block";
    
    captureBtn.style.display = "none";
    retryBtn.style.display = "block";
    previewText.innerText = "正在進行多重演算法比對...";

    // 準備 OCR 畫布 (裁切中心區域)
    calcCanvas.width = 1000;
    calcCanvas.height = 500;
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.25;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;

    const filters = [
        'contrast(3) grayscale(1) brightness(0.8)',
        'contrast(2) grayscale(1) brightness(1.2)',
        'contrast(4) grayscale(1) invert(0)',
        'contrast(2.5) grayscale(1) brightness(1.0)'
    ];

    let votes = {};

    for (let f of filters) {
        cCtx.filter = f;
        cCtx.drawImage(snapCanvas, sx, sy, sw, sh, 0, 0, 1000, 500);
        
        try {
            const result = await Tesseract.recognize(calcCanvas, 'eng', {
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                tessedit_pageseg_mode: '7'
            });
            let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
            if (validateMoto(txt)) {
                votes[txt] = (votes[txt] || 0) + 1;
            }
        } catch (e) {}
    }

    const winners = Object.keys(votes);
    if (winners.length > 0) {
        const best = winners.reduce((a, b) => votes[a] > votes[b] ? a : b);
        plateDisplay.innerText = best;
        plateDisplay.style.color = "var(--green)";
        previewText.innerText = `辨識成功 (信心度: ${votes[best]}/4)`;
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識成功 ${best.split('').join(' ')}`));
    } else {
        plateDisplay.innerText = "RETRY";
        previewText.innerText = "無法確認號碼，請重新拍攝";
    }
});

// 3. 重試
retryBtn.addEventListener('click', () => {
    snapCanvas.style.display = "none";
    retryBtn.style.display = "none";
    captureBtn.style.display = "block";
    plateDisplay.innerText = "----";
    plateDisplay.style.color = "white";
    previewText.innerText = "對準後重新捕捉";
});
