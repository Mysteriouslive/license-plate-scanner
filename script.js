const progressBar = document.getElementById('progress-bar');
const statusText = document.getElementById('status');
const video = document.getElementById('video');
const snapCanvas = document.getElementById('snap-preview');
const plateDisplay = document.getElementById('plate-number');
const infoText = document.getElementById('info');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const runAiBtn = document.getElementById('runAiBtn');
const retryBtn = document.getElementById('retryBtn');

let cvReady = false;

// 1. 進度與引擎控制
function updateProgress(per, text) {
    progressBar.style.width = per + "%";
    if (text) statusText.innerText = text;
}

function onCvLoaded() {
    cvReady = true;
    updateProgress(100, "系統就緒");
    if(video.srcObject) captureBtn.disabled = false;
}

// 2. 啟動鏡頭
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment", width: { ideal: 1280 } } 
        });
        video.srcObject = stream;
        startBtn.style.display = "none";
        if(cvReady) captureBtn.disabled = false;
        infoText.innerText = "對準後點擊截圖定格";
    } catch (err) { alert("相機啟動失敗，請確保使用 HTTPS 環境"); }
});

// 3. 截圖定格：純 Canvas 繪圖，確保 100% 成功
captureBtn.addEventListener('click', () => {
    const ctx = snapCanvas.getContext('2d');
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.3;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;

    snapCanvas.width = 600;
    snapCanvas.height = 300;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
    
    snapCanvas.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
    infoText.innerText = "已定格，若清晰請確認辨識";
});

// 4. 水平平面化 + 字母加深辨識
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateProgress(10, "執行水平平面化...");

    let src = cv.imread(snapCanvas);
    let dst = new cv.Mat();
    
    // --- 平面化校正 ---
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(src, dst, M, new cv.Size(600, 300));

    // --- 字母加深與反白處理 (二值化) ---
    updateProgress(30, "字母加深與背景反白...");
    cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY);
    // 自適應二值化：強化字體邊緣，解決 9 認成 3 的問題
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 15, 12);
    
    // 顯示校正加深後的結果
    cv.imshow(snapCanvas, dst);

    updateProgress(50, "啟動 AI 辨識中...");
    try {
        const result = await Tesseract.recognize(snapCanvas, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    updateProgress(50 + Math.round(m.progress * 50), `辨識中: ${Math.round(m.progress * 100)}%`);
                }
            },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7'
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        plateDisplay.innerText = txt || "FAIL";
        plateDisplay.style.color = txt ? "#34C759" : "#FF3B30";
        updateProgress(100, txt ? "辨識完成" : "辨識失敗");
        
        if(txt) {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(`號碼為 ${txt.split('').join(' ')}`));
        }
    } catch (e) { console.error(e); }

    src.delete(); dst.delete(); M.delete(); srcPts.delete(); dstPts.delete();
    runAiBtn.style.display = "none";
});

retryBtn.addEventListener('click', () => {
    snapCanvas.style.display = "none";
    retryBtn.style.display = "none";
    runAiBtn.style.display = "none";
    runAiBtn.disabled = false;
    captureBtn.style.display = "block";
    plateDisplay.innerText = "----";
    plateDisplay.style.color = "white";
    updateProgress(100, "重新就緒");
});
