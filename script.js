captureBtn.addEventListener('click', async () => {
    const sCtx = snapCanvas.getContext('2d');
    const cCtx = calcCanvas.getContext('2d');
    
    // 1. 定義裁切區域 (與 CSS 的藍色框框同步)
    // 這是視訊流中的座標比例
    const sx = video.videoWidth * 0.2, sy = video.videoHeight * 0.25;
    const sw = video.videoWidth * 0.6, sh = video.videoHeight * 0.4;

    // 2. 讓顯示用的 Canvas 只畫出裁切後的內容
    snapCanvas.width = 600; // 固定顯示解析度
    snapCanvas.height = 300;
    
    // 將影片中的框框內容畫到顯示 Canvas
    sCtx.drawImage(video, sx, sy, sw, sh, 0, 0, 600, 300);
    snapCanvas.style.display = "block"; // 顯示定格內容
    
    captureBtn.style.display = "none";
    retryBtn.style.display = "block";
    previewText.innerText = "正在分析框內號碼...";

    // 3. 準備給 AI 算的畫布 (calc-canvas)
    calcCanvas.width = 1000;
    calcCanvas.height = 500;

    const filters = [
        'contrast(3.5) grayscale(1) brightness(0.8)', // 專治 9/3 誤認
        'contrast(2.5) grayscale(1) brightness(1.2)',
        'contrast(4) grayscale(1) invert(0)',
        'contrast(3) grayscale(1) brightness(1.0)'
    ];

    let votes = {};

    for (let f of filters) {
        cCtx.filter = f;
        // AI 直接從剛才拍下的 snapCanvas 讀取，確保來源一致
        cCtx.drawImage(snapCanvas, 0, 0, 600, 300, 0, 0, 1000, 500);
        
        try {
            const result = await Tesseract.recognize(calcCanvas, 'eng', {
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                tessedit_pageseg_mode: '7'
            });
            let txt = result.data.text.replace(/[^A-Z0-9]/g, "");
            if (validateMoto(txt)) {
                votes[txt] = (votes[txt] || 0) + 1;
            }
        } catch (e) {}
    }

    // ... (後續統計與顯示邏輯維持不變)
});
