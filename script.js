const video = document.getElementById('video');
const snapCanvas = document.getElementById('snap-preview');
const calcCanvas = document.getElementById('calc-canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const retryBtn = document.getElementById('retryBtn');

// 台灣機車規則
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
        previewText.innerText = "請將車牌放入藍色框內拍攝";
    } catch (err) { alert("無法存取相機"); }
});

// 2. 捕捉並多重辨識
captureBtn.addEventListener('click', async () => {
    const sCtx = snapCanvas.getContext('2d');
    const cCtx = calcCanvas.getContext('2d');
    
    // 獲取相機流中的裁切座標 (對齊 CSS 框框位置)
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.3;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;

    // 定格顯示框框內的畫面
    snapCanvas.width = 600;
    snapCanvas.height = 300;
    sCtx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
    snapCanvas.style.display = "block";
    
    captureBtn.style.display = "none";
    retryBtn.style.display = "block";
    previewText.innerText = "多重辨識中，請稍候...";

    // AI 計算專用畫布
    calcCanvas.width = 1000;
    calcCanvas.height = 500;

    // 不同濾鏡組，專門解決 9/3 誤認
    const filters = [
        'contrast(3.5) grayscale(1) brightness(0.8)', 
        'contrast(2.5) grayscale(1) brightness(1.2)',
        'contrast(4) grayscale(1) invert(0)'
    ];

    let votes = {};

    for (let f of filters) {
        cCtx.filter = f;
        // 直接從剛才拍下的 snapCanvas 取圖
        cCtx.drawImage(snapCanvas, 0, 0, 600, 300, 0, 0, 1000, 500);
        
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
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識成功 ${best.split('').join(' ')}`));
    } else {
        plateDisplay.innerText = "FAIL";
        previewText.innerText = "辨識失敗，請調整角度重新拍攝";
    }
});

// 3. 重試
retryBtn.addEventListener('click', () => {
    snapCanvas.style.display = "none";
    retryBtn.style.display = "none";
    captureBtn.style.display = "block";
    plateDisplay.innerText = "----";
    plateDisplay.style.color = "white";
    previewText.innerText = "請重新對準後捕捉";
});
