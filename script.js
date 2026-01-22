const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const plateDisplay = document.getElementById('plate-number');
const previewText = document.getElementById('live-preview');
const confirmBtn = document.getElementById('confirmBtn');
const startBtn = document.getElementById('startBtn');

let isScanning = false;

async function initCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment", width: 1280 } 
    });
    video.srcObject = stream;
    startBtn.style.display = "none";
    isScanning = true;
    requestAnimationFrame(processFrame);
}

async function processFrame() {
    if (!isScanning) return;

    const ctx = canvas.getContext('2d');
    // 設定擷取比例：因為框框在上方，我們只抓取畫面中上的部分
    canvas.width = 400;
    canvas.height = 200;

    // 擷取影像中上的區域
    ctx.drawImage(video, video.videoWidth*0.2, video.videoHeight*0.1, video.videoWidth*0.6, video.videoHeight*0.4, 0, 0, 400, 200);

    try {
        const result = await Tesseract.recognize(canvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
        });

        const rawText = result.data.text.trim();
        previewText.innerText = "偵測中: " + (rawText || "...");

        // 正則匹配：搜尋符合車牌格式的字串
        const match = rawText.match(/[A-Z0-9-]{5,8}/);
        if (match) {
            plateDisplay.innerText = match[0];
            confirmBtn.style.display = "block"; // 顯示確認按鈕
        }
    } catch (e) {}

    setTimeout(processFrame, 800);
}

confirmBtn.addEventListener('click', () => {
    alert("已確認車牌號碼：" + plateDisplay.innerText);
    // 可以在這裡把資料送到後端或儲存
});

startBtn.addEventListener('click', initCamera);
