const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const plateDisplay = document.getElementById('plate-number');
const statusText = document.getElementById('status');
const startBtn = document.getElementById('startBtn');

async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: 1280, height: 720 }
        });
        video.srcObject = stream;
        statusText.innerText = "SCANNING...";
        startBtn.style.display = "none";
        requestAnimationFrame(processFrame);
    } catch (err) {
        statusText.innerText = "CAMERA ERROR";
    }
}

async function processFrame() {
    if (video.paused || video.ended) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 640; 
    canvas.height = 360;

    // 關鍵調整：裁切範圍上移 (對應 CSS 的 padding-top)
    // 我們抓取影片畫面中上方約 30% 處的影像
    ctx.drawImage(video, video.videoWidth * 0.2, video.videoHeight * 0.2, video.videoWidth * 0.6, video.videoHeight * 0.3, 0, 0, canvas.width, canvas.height);

    try {
        const result = await Tesseract.recognize(canvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
        });

        const match = result.data.text.match(/[A-Z0-9-]{5,8}/);
        if (match) {
            plateDisplay.innerText = match[0];
            // 辨識到時閃爍提示
            document.querySelector('.scan-frame').style.borderColor = "#fff";
            setTimeout(() => {
                document.querySelector('.scan-frame').style.borderColor = "rgba(255,255,255,0.3)";
            }, 200);
        }
    } catch (e) {}

    setTimeout(processFrame, 1000); // 每一秒辨識一次，平衡性能與電力
}

startBtn.addEventListener('click', initCamera);
