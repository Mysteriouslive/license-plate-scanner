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

/* ================= 自動學習（本地） ================= */
const LEARN_KEY = 'plate_learn_map';

function loadLearnMap() {
    return JSON.parse(localStorage.getItem(LEARN_KEY) || '{}');
}

function saveLearnMap(map) {
    localStorage.setItem(LEARN_KEY, JSON.stringify(map));
}

// 記錄：誤判 → 正解
function learnCorrection(raw, fixed) {
    if (raw === fixed) return;
    const map = loadLearnMap();
    map[raw] = map[raw] || {};
    map[raw][fixed] = (map[raw][fixed] || 0) + 1;
    saveLearnMap(map);
}

// 加權：如果學過，給分
function applyLearnScore(text) {
    const map = loadLearnMap();
    let bonus = 0;
    Object.keys(map).forEach(k => {
        if (text.startsWith(k)) {
            const total = Object.values(map[k]).reduce((a,b)=>a+b,0);
            bonus += Math.min(20, total * 2);
        }
    });
    return bonus;
}

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
    if (!cvReady) {
        alert("系統尚未初始化完成，請稍候 1 秒");
        return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } }
    });
    video.srcObject = stream;
    startBtn.style.display = "none";
    if (cvReady) captureBtn.disabled = false;
    infoText.innerText = "請對準車牌後按下定格";
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

/* ================= 車牌定位 ================= */
function detectPlateCandidates(src) {
    let g = new cv.Mat(), b = new cv.Mat(), e = new cv.Mat();
    let cts = new cv.MatVector(), h = new cv.Mat();
    cv.cvtColor(src, g, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(g, b, new cv.Size(5,5), 0);
    cv.Canny(b, e, 100, 200);
    cv.findContours(e, cts, h, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const out = [], area = src.cols * src.rows;
    for (let i=0;i<cts.size();i++){
        const r = cv.boundingRect(cts.get(i));
        const ratio = r.width / r.height;
        const a = r.width * r.height;
        if (ratio>2.2 && ratio<4.2 && a>area*0.05 && a<area*0.4) out.push(r);
        cts.get(i).delete();
    }
    g.delete(); b.delete(); e.delete(); cts.delete(); h.delete();
    return out;
}

/* ================= 字元切割 ================= */
function splitCharacters(mat) {
    let cts = new cv.MatVector(), h = new cv.Mat();
    cv.findContours(mat, cts, h, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const chars = [];
    for (let i=0;i<cts.size();i++){
        const r = cv.boundingRect(cts.get(i));
        if (r.height > mat.rows*0.4 && r.width > mat.cols*0.02) chars.push(r);
        cts.get(i).delete();
    }
    cts.delete(); h.delete();
    chars.sort((a,b)=>a.x-b.x);
    return chars;
}

/* ================= 單字 OCR ================= */
async function ocrChar(src, rect) {
    let roi = src.roi(rect), rs = new cv.Mat();
    cv.resize(roi, rs, new cv.Size(60,80));
    cv.imshow(snap, rs);
    let ch='', conf=0;
    try {
        const r = await Tesseract.recognize(snap,'eng',{
            tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode:'10'
        });
        ch = r.data.text.replace(/[^A-Z0-9]/g,'')[0]||'';
        conf = r.data.confidence||0;
    } catch {}
    roi.delete(); rs.delete();
    return {ch, conf};
}

/* ================= 逐字 OCR ================= */
async function ocrByChars(mat) {
    const rects = splitCharacters(mat);
    let text='', score=0;
    for (let r of rects){
        const o = await ocrChar(mat,r);
        text+=o.ch; score+=o.conf;
    }
    return {text: normalizePlate(text), score};
}

/* ================= 定格 ================= */
captureBtn.addEventListener('click', async ()=>{
    await captureBurst();
    snap.style.display="block";
    captureBtn.style.display="none";
    runAiBtn.style.display="block";
    retryBtn.style.display="block";
});

/* ================= 辨識主流程 ================= */
runAiBtn.addEventListener('click', async ()=>{
    runAiBtn.disabled=true;
    const results=[];

    for (const f of frameBuffer){
        const src=cv.imread(f);
        const rects=detectPlateCandidates(src);
        for (const r of rects){
            const roi=src.roi(r);
            cv.cvtColor(roi, roi, cv.COLOR_RGBA2GRAY);
            cv.adaptiveThreshold(roi, roi,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY,17,13);
            const res=await ocrByChars(roi);
            if (validateTaiwanMoto(res.text)){
                const bonus=applyLearnScore(res.text);
                results.push({text:res.text, score:res.score+bonus});
            }
            roi.delete();
        }
        src.delete();
    }

    results.sort((a,b)=>b.score-a.score);
    const best=results[0];

    if (best){
        plateDisplay.innerText=best.text;
        plateDisplay.style.color="#34C759";
        updateStatus(100,"辨識成功");
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`號碼 ${best.text.split('').join(' ')}`));

        // 學習
        results.forEach(r=>{
            if (r.text!==best.text) learnCorrection(r.text,best.text);
        });
    } else {
        updateStatus(100,"辨識失敗");
    }
    runAiBtn.style.display="none";
});

/* ================= 重拍 ================= */
retryBtn.addEventListener('click',()=>{
    frameBuffer=[];
    snap.style.display="none";
    retryBtn.style.display="none";
    runAiBtn.style.display="none";
    runAiBtn.disabled=false;
    captureBtn.style.display="block";
    plateDisplay.innerText="----";
    plateDisplay.style.color="white";
    updateStatus(100,"重新就緒");
});