const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const snapPreview = document.getElementById('snap-preview');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const captureBtn = document.getElementById('captureBtn');
const retryBtn = document.getElementById('retryBtn');

const validateMoto = (t) => /^[A-Z]{3}[0-9]{3,4}$|^[0-9]{3}[A-Z]{3}$/.test(t);

async function initCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment", width: { ideal: 1920 } } 
    });
    video.srcObject = stream;
}

// 執行定格比對
async function startRecognition() {
    const ctx = canvas.getContext('2d');
    canvas.width = 1000; canvas.height = 500;

    // 1. 拍照定格
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.25;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;
    
    // 顯示定格圖
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    snapPreview.src = canvas.toDataURL('image/jpeg');
    snapPreview.style.display = 'block';
    
    captureBtn.disabled = true;
    captureBtn.innerText = "正在多重比對...";
    
    let votes = {};
    // 2. 對同一張圖執行 5 種不同預處理參數
    const filters = [
        'contrast(3) grayscale(1) brightness(0.8)',
        'contrast(2) grayscale(1) brightness(1.2)',
        'contrast(4) grayscale(1) brightness(0.7) blur(0.5px)',
        'contrast(2.5) grayscale(1) invert(0)',
        'contrast(5) grayscale(1) brightness(0.6)'
    ];

    for (let f of filters) {
        ctx.filter = f;
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 1000, 500);
        
        try {
            const result = await Tesseract.recognize(canvas, 'eng', {
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                tessedit_pageseg_mode: '7'
            });
            let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
            if (validateMoto(txt)) {
                votes[txt] = (votes[txt] || 0) + 1;
                previewText.innerText = `發現可能號碼: ${txt}`;
            }
        } catch (e) {}
    }

    // 3. 找出票數最高的結果
    const winners = Object.keys(votes);
    if (winners.length > 0) {
        const bestMatch = winners.reduce((a, b) => votes[a] > votes[b] ? a : b);
        plateDisplay.innerText = bestMatch;
        plateDisplay.style.color = "#34C759";
        previewText.innerText = `辨識完成 (信心度: ${votes[bestMatch]}/5)`;
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識成功 ${bestMatch.split('').join(' ')}`));
    } else {
        previewText.innerText = "無法辨識，請調整角度重試";
        plateDisplay.innerText = "FAIL";
    }

    captureBtn.style.display = 'none';
    retryBtn.style.display = 'block';
}

retryBtn.addEventListener('click', () => {
    snapPreview.style.display = 'none';
    retryBtn.style.display = 'none';
    captureBtn.style.display = 'block';
    captureBtn.disabled = false;
    captureBtn.innerText = "📸 捕捉並辨識";
    plateDisplay.innerText = "----";
    plateDisplay.style.color = "white";
    previewText.innerText = "對準後按下捕捉";
});

captureBtn.addEventListener('click', startRecognition);
initCamera();
