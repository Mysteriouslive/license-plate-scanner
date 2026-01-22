/* ================= DOM ================= */
const video = document.getElementById('video');
const snap = document.getElementById('snap-preview');
const progress = document.getElementById('progress-fill');
const statusText = document.getElementById('status');
const plateDisplay = document.getElementById('plate-number');
const infoText = document.getElementById('info');
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const runAiBtn = document.getElementById('runAiBtn');
const retryBtn = document.getElementById('retryBtn');

let cvReady = false;
let frameBuffer = [];

/* ================= 台灣機車規則 ================= */
const validateTaiwanMoto = t =>
    /^[A-Z]{3}[0-9]{3,4}$/.test(t) || /^[0-9]{3}[A-Z]{3}$/.test(t);

const normalizePlate = t =>
    t.replace(/O/g,'0').replace(/I/g,'1').replace(/Z/g,'2')
     .replace(/S/g,'5').replace(/B/g,'8');

/* ================= 狀態 ================= */
function cvLoaded() {
    cvReady = true;
    updateStatus(100, "系統就緒");
    if (video.srcObject) captureBtn.disabled = false;
}
function updateStatus(p, t) {
    progress.style.width = p + "%";
    if (t) statusText.innerText = t;
}

/* ================= 啟動鏡頭 ================= */
startBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1280 } }
        });
        video.srcObject = stream;
        startBtn.style.display = "none";
        if (cvReady) captureBtn.disabled = false;
        infoText.innerText = "請對準車牌後按下定格";
    } catch {
        alert("鏡頭啟動失敗，請確認 HTTPS");
    }
});

/* ================= 連拍 ================= */
async function captureBurst() {
    frameBuffer = [];
    for (let i = 0; i < 3; i++) {
        const c = document.createElement('canvas');
        c.width = 600; c.height = 300;
        c.getContext('2d').drawImage(video, 0, 0, 600, 300);
        frameBuffer.push(c);
        await new Promise(r => setTimeout(r, 120));
    }
}

/* ================= 車牌候選框偵測 ================= */
function detectPlateCandidates(src) {
    let gray = new cv.Mat(), blur = new cv.Mat(), edge = new cv.Mat();
    let contours = new cv.MatVector(), hierarchy = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blur, new cv.Size(5,5), 0);
    cv.Canny(blur, edge, 100, 200);
    cv.findContours(edge, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const plates = [];
    const imgArea = src.cols * src.rows;

    for (let i = 0; i < contours.size(); i++) {
        const rect = cv.boundingRect(contours.get(i));
        const ratio = rect.width / rect.height;
        const area = rect.width * rect.height;

        if (ratio > 2.2 && ratio < 4.2 && area > imgArea*0.05 && area < imgArea*0.4) {
            plates.push(rect);
        }
        contours.get(i).delete();
    }
    gray.delete(); blur.delete(); edge.delete();
    contours.delete(); hierarchy.delete();
    return plates;
}

/* ================= 影像強化 ================= */
function sharpen(mat) {
    const k = cv.matFromArray(3,3,cv.CV_32F,[0,-1,0,-1,5,-1,0,-1,0]);
    cv.filter2D(mat, mat, cv.CV_8U, k);
    k.delete();
}

/* ================= 評分 ================= */
function scoreResult(text, conf=0) {
    let s = conf;
    if (validateTaiwanMoto(text)) s += 40;
    if (/^[A-Z]{3}/.test(text)) s += 10;
    if (/[0-9]{3,4}$/.test(text)) s += 10;
    return s;
}

/* ================= 定格 ================= */
captureBtn.addEventListener('click', async () => {
    await captureBurst();
    snap.style.display = "block";
    captureBtn.style.display = "none";
    runAiBtn.style.display = "block";
    retryBtn.style.display = "block";
    updateStatus(10, "已定格");
});

/* ================= 辨識主流程 ================= */
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateStatus(20, "辨識中...");

    const results = [];

    for (const frame of frameBuffer) {
        let src = cv.imread(frame);
        const rects = detectPlateCandidates(src);

        for (const r of rects) {
            let roi = src.roi(r);
            let gray = new cv.Mat();

            cv.cvtColor(roi, gray, cv.COLOR_RGBA2GRAY);
            cv.adaptiveThreshold(
                gray, gray, 255,
                cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv.THRESH_BINARY, 17, 13
            );
            sharpen(gray);
            cv.imshow(snap, gray);

            try {
                const res = await Tesseract.recognize(snap, 'eng', {
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                    tessedit_pageseg_mode: '7'
                });
                const txt = normalizePlate(
                    res.data.text.replace(/[^A-Z0-9]/g,'')
                );
                if (txt.length >= 6) {
                    results.push({
                        text: txt,
                        score: scoreResult(txt, res.data.confidence)
                    });
                }
            } catch {}

            roi.delete(); gray.delete();
        }
        src.delete();
    }

    results.sort((a,b)=>b.score-a.score);
    const best = results.find(r=>validateTaiwanMoto(r.text));

    if (best) {
        plateDisplay.innerText = best.text;
        plateDisplay.style.color = "#34C759";
        updateStatus(100, "辨識成功");
        window.speechSynthesis.speak(
            new SpeechSynthesisUtterance(`號碼 ${best.text.split('').join(' ')}`)
        );
    } else {
        plateDisplay.innerText = "----";
        plateDisplay.style.color = "orange";
        updateStatus(100, "辨識失敗");
    }

    runAiBtn.style.display = "none";
});

/* ================= 重拍 ================= */
retryBtn.addEventListener('click', () => {
    frameBuffer = [];
    snap.style.display = "none";
    retryBtn.style.display = "none";
    runAiBtn.style.display = "none";
    runAiBtn.disabled = false;
    captureBtn.style.display = "block";
    plateDisplay.innerText = "----";
    plateDisplay.style.color = "white";
    updateStatus(100, "重新就緒");
});