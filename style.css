const video = document.getElementById('video');
const snapCanvas = document.getElementById('snap-preview');
const calcCanvas = document.getElementById('calc-canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const retryBtn = document.getElementById('retryBtn');
const statusText = document.getElementById('status');

const validateMoto = (t) => /^[A-Z]{3}[0-9]{3,4}$|^[0-9]{3}[A-Z]{3}$/.test(t);

// 檢查 Tesseract 是否加載成功
window.onload = () => {
    if (typeof Tesseract !== 'undefined') {
        statusText.innerText = "系統就緒";
    } else {
        statusText.innerText = "引擎載入失敗，請重整";
    }
};

startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1280 } } 
        });
        video.srcObject = stream;
        // 確保影片播放後才允許點擊捕捉
        video.onloadedmetadata = () => {
            video.play();
            startBtn.style.display = "none";
            captureBtn.disabled = false;
            previewText.innerText = "已就緒，請對準車牌拍照";
        };
    } catch (err) {
        alert("相機開啟失敗：請檢查是否為 HTTPS 連線或已授權相機");
    }
});

captureBtn.addEventListener('click', async () => {
    // 1. 立即停止任何可能的舊動作並顯示「正在處理」
    captureBtn.disabled = true;
    previewText.innerText = "捕捉中...";

    const sCtx = snapCanvas.getContext('2d');
    const cCtx = calcCanvas.getContext('2d');
    
    // 2. 捕捉定格
    try {
        const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.3;
        const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;

        snapCanvas.width = 600;
        snapCanvas.height = 300;
        sCtx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
        snapCanvas.style.display = "block";
        
        captureBtn.style.display = "none";
        retryBtn.style.display = "block";
        previewText.innerText = "正在進行多重辨識...";

        // 3. AI 辨識流程
        calcCanvas.width = 1000;
        calcCanvas.height = 500;
        const filters = [
            'contrast(3.5) grayscale(1) brightness(0.8)',
            'contrast(2.5) grayscale(1) brightness(1.2)'
        ];

        let votes = {};
        for (let f of filters) {
            cCtx.filter = f;
            cCtx.drawImage(snapCanvas, 0, 0, 600, 300, 0, 0, 1000, 500);
            
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
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識成功 ${best.split('').join(' ')}`));
            previewText.innerText = "辨識完成";
        } else {
            plateDisplay.innerText = "FAIL";
            previewText.innerText = "辨識失敗，請重拍";
        }
    } catch (e) {
        alert("辨識過程發生錯誤，請重新捕捉");
        resetUI();
    }
});

function resetUI() {
    snapCanvas.style.display = "none";
    retryBtn.style.display = "none";
    captureBtn.style.display = "block";
    captureBtn.disabled = false;
    plateDisplay.innerText = "----";
    plateDisplay.style.color = "white";
    previewText.innerText = "請重新對準後捕捉";
}

retryBtn.addEventListener('click', resetUI);
