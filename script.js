// 3. 影像處理與辨識 (準確度極致優化版)
runAiBtn.addEventListener('click', async () => {
    runAiBtn.disabled = true;
    updateStatus(20, "執行深度影像強化...");

    let src = cv.imread(snap);
    let dst = new cv.Mat();
    
    // A. 水平平面化校正 (維持原有的校正邏輯)
    let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 600, 0, 600, 300, 0, 300]);
    let M = cv.getPerspectiveTransform(srcPts, dstPts);
    cv.warpPerspective(src, dst, M, new cv.Size(600, 300));

    // B. 灰階化與「銳利化」處理 (提升邊緣強度)
    cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY);
    let kernel = cv.matFromArray(3, 3, cv.CV_32F, [0, -1, 0, -1, 5, -1, 0, -1, 0]);
    cv.filter2D(dst, dst, cv.CV_8U, kernel);

    // C. 自適應二值化：調整參數 17 (區塊大小) 與 13 (常數)
    // 這組參數能讓 9 的筆畫更粗、更黑，防止 9 的頂部斷裂被誤認成 3
    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 17, 13);
    
    // D. 形態學處理：去除細小雜訊 (噪點)
    let ksize = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2));
    cv.morphologyEx(dst, dst, cv.MORPH_OPEN, ksize);

    // 顯示強化後的結果
    cv.imshow(snap, dst);

    updateStatus(50, "啟動 AI 深度辨識...");
    try {
        const result = await Tesseract.recognize(snap, 'eng', {
            logger: m => { if(m.status === 'recognizing text') updateStatus(50 + (m.progress * 50), "分析中..."); },
            // 限制僅辨識大寫英數，並強制使用 PSM 7 (單行文字)
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
            tessedit_pageseg_mode: '7' 
        });

        let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
        
        // 台灣機車規則驗證
        if (validateTaiwanMoto(txt)) {
            plateDisplay.innerText = txt;
            plateDisplay.style.color = "#34C759";
            updateStatus(100, "辨識成功");
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(`號碼 ${txt.split('').join(' ')}`));
        } else {
            // 若不符規則，嘗試二次清洗 (處理常見的誤認字元)
            txt = txt.replace(/O/g, '0').replace(/I/g, '1'); 
            if (validateTaiwanMoto(txt)) {
                plateDisplay.innerText = txt;
                plateDisplay.style.color = "#34C759";
                updateStatus(100, "辨識成功 (校正後)");
            } else {
                plateDisplay.innerText = txt || "FAIL";
                plateDisplay.style.color = "orange";
                infoText.innerText = "格式不符，建議微調角度後重拍";
                updateStatus(100, "辨識結束 (格式不符)");
            }
        }
    } catch (e) { console.error(e); }

    src.delete(); dst.delete(); M.delete(); kernel.delete(); ksize.delete();
    runAiBtn.style.display = "none";
});
