const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const confirmBtn = document.getElementById('confirmBtn');
const startBtn = document.getElementById('startBtn');
const statusText = document.getElementById('status');

let isScanning = false;
let resultBuffer = []; 
const BUFFER_SIZE = 8; // 收集最近 8 次辨識結果進行投票

function onOpenCvReady() {
    statusText.innerText = "READY";
}

async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1280 } } 
        });
        video.srcObject = stream;
        startBtn.style.display = "none";
        statusText.innerText = "SCANNING...";
        isScanning = true;
        processFrame();
    } catch (err) { statusText.innerText = "ERROR: NO CAMERA"; }
}

async function processFrame() {
    if (!isScanning || typeof cv === 'undefined') return;

    try {
        const ctx = canvas.getContext('2d');
        canvas.width = 400; canvas.height = 200;

        // 1. OpenCV 預處理：讓字體邊緣極度銳化
        let src = cv.imread(video);
        let dst = new cv.Mat();
        let gray = new cv.Mat();
        
        // 裁切視訊中央區域 (ROI)
        let rect = new cv.Rect(video.videoWidth * 0.2, video.videoHeight * 0.3, video.videoWidth * 0.6, video.videoHeight * 0.4);
        dst = src.roi(rect);
        
        // 轉灰階並套用自適應二值化 (這是提升正確率的關鍵)
        cv.cvtColor(dst, gray, cv.COLOR_RGBA2GRAY);
        cv.adaptiveThreshold(gray, gray, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
        
        cv.imshow(canvas, gray); // 將預處理後的黑白影像畫到 canvas

        // 2. Tesseract OCR 辨識
        const result = await Tesseract.recognize(canvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7',
        });

        let cleanText = result.data.text.replace(/[^A-Z0-9]/g, "");
        
        // 3. 加權投票機制 (防止閃爍與誤讀)
        if (cleanText.length >= 5 && cleanText.length <= 8) {
            resultBuffer.push(cleanText);
            if (resultBuffer.length > BUFFER_SIZE) resultBuffer.shift();

            // 計算出現頻率最高的號碼
            const counts = {};
            resultBuffer.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
            const mostFrequent = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);

            previewText.innerText = `穩定度: ${Math.round((counts[mostFrequent]/BUFFER_SIZE)*100)}%`;
            
            // 只要 8 次中有 3 次以上穩定出現，就判定為正確
            if (counts[mostFrequent] >= 3) {
                plateDisplay.innerText = mostFrequent;
                confirmBtn.style.display = "block";
            }
        }

        // 釋放記憶體
        src.delete(); dst.delete(); gray.delete();
    } catch (e) { console.error(e); }

    // 每一秒抓取約 2-3 次，避免手機過熱
    setTimeout(processFrame, 400);
}

startBtn.addEventListener('click', initCamera);
confirmBtn.addEventListener('click', () => alert("已確認車牌：" + plateDisplay.innerText));
