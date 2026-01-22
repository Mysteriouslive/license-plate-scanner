const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const startBtn = document.getElementById('startBtn');

let isScanning = false;
let resultBuffer = [];
let frameCount = 0;

// 台灣機車規則 (擴大容錯)
const validateMoto = (t) => /^[A-Z]{3}[0-9]{3,4}$|^[0-9]{3}[A-Z]{3}$/.test(t);

async function initCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment", width: { ideal: 1920 } } 
    });
    video.srcObject = stream;
    startBtn.style.display = "none";
    isScanning = true;
    processFrame();
}

async function processFrame() {
    if (!isScanning) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 800; canvas.height = 400;

    const sx = video.videoWidth * 0.15, sy = video.videoHeight * 0.2, 
          sw = video.videoWidth * 0.7, sh = video.videoHeight * 0.5;

    // --- 【多角度優化：交替預處理】 ---
    // 單數影格用極高對比（應付斜向陰影），雙數影格用正常對比（應付反光）
    frameCount++;
    if (frameCount % 2 === 0) {
        ctx.filter = 'contrast(4) grayscale(1) brightness(0.8) sharp(1px)';
    } else {
        ctx.filter = 'contrast(2) grayscale(1) brightness(1.1)';
    }
    
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 800, 400);

    try {
        const result = await Tesseract.recognize(canvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });

        let cleanText = result.data.text.replace(/[^A-Z0-9]/g, "");
        
        if (validateMoto(cleanText)) {
            resultBuffer.push(cleanText);
            if (resultBuffer.length > 12) resultBuffer.shift();

            // 統計結果
            const counts = {};
            resultBuffer.forEach(x => counts[x] = (counts[x] || 0) + 1);
            const winner = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            
            const conf = counts[winner] / resultBuffer.length;
            previewText.innerText = `穩定度: ${Math.round(conf*100)}% | 偵測: ${cleanText}`;

            // 多角度下的自動確認：只要 12 次中有 4 次抓到正確，就自動鎖定
            if (conf >= 0.35 && resultBuffer.length >= 8) {
                isScanning = false;
                confirmPlate(winner);
            }
        }
    } catch (e) {}
    
    setTimeout(processFrame, 300);
}

function confirmPlate(plate) {
    plateDisplay.innerText = plate;
    plateDisplay.style.color = "#34C759";
    document.querySelector('.scan-frame').style.borderColor = "#34C759";
    
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(`辨識成功 ${plate.split('').join(' ')}`));
    
    setTimeout(() => {
        if(confirm(`確認車牌：${plate}\n繼續掃描？`)) {
            isScanning = true;
            resultBuffer = [];
            document.querySelector('.scan-frame').style.borderColor = "#0A84FF";
            plateDisplay.style.color = "white";
            processFrame();
        }
    }, 500);
}

startBtn.addEventListener('click', initCamera);
