// ... (前面 startBtn 與 captureBtn 的部分保持不變)

runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateStatus(10, "執行水平平面化...");

    let src = cv.imread(snap); // 讀取剛才截圖的影像
    let dst = new cv.Mat();
    let dsize = new cv.Size(600, 300);

    // --- 1. 水平平面化 (透視變換) ---
    // 我們將裁切出的區域強行映射到標準長方形座標
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(src, dst, M, dsize);

    // --- 2. 字母加深、背景反白 (高級二值化) ---
    updateStatus(30, "字母加深處理中...");
    cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY); // 轉灰階
    
    // 使用自適應二值化：專門處理光線不均，並讓文字筆畫變黑
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 15, 10);
    
    // 顯示「平面化+加深」後的黑白影像在畫面上
    cv.imshow(snap, dst);

    updateStatus(50, "啟動 AI 辨識...");

    try {
        const result = await Tesseract.recognize(snap, 'eng', {
            logger: m => { if(m.status === 'recognizing text') updateStatus(50 + (m.progress * 50), "分析中..."); },
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7' // 告訴 AI 這是一行文字
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        plateDisplay.innerText = txt || "FAIL";
        plateDisplay.style.color = txt ? "#34C759" : "#FF3B30";
        updateStatus(100, txt ? "辨識成功" : "辨識失敗");
        
        if (txt) {
            const msg = new SpeechSynthesisUtterance(`辨識結果 ${txt.split('').join(' ')}`);
            window.speechSynthesis.speak(msg);
        }
    } catch (e) { console.error(e); }

    src.delete(); dst.delete(); M.delete(); srcPts.delete(); dstPts.delete();
    runAiBtn.style.display = "none";
});
