async function processFrame() {
    if (!isScanning) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 200;

    // 擷取影像中上的區域（對應你的藍色框框）
    ctx.drawImage(video, video.videoWidth*0.2, video.videoHeight*0.1, video.videoWidth*0.6, video.videoHeight*0.4, 0, 0, 400, 200);

    try {
        const result = await Tesseract.recognize(canvas, 'eng', {
            // 【關鍵】只允許大寫英文字母與數字，徹底排除符號
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        });

        // 1. 取得原始文字
        let rawText = result.data.text;

        // 2. 用正則表達式再次過濾：只留下 A-Z 和 0-9
        let cleanText = rawText.replace(/[^A-Z0-9]/g, "");

        previewText.innerText = "掃描中: " + (cleanText || "...");

        // 3. 判斷長度（一般車牌為 5-8 碼），符合才顯示在主視窗
        if (cleanText.length >= 5 && cleanText.length <= 8) {
            plateDisplay.innerText = cleanText;
            confirmBtn.style.display = "block";
        }
    } catch (e) {
        console.error("辨識出錯:", e);
    }

    // 稍微縮短間隔，增加即時感
    setTimeout(processFrame, 600);
}
