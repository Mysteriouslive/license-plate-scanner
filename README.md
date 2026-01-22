# 🚗 AI License Plate Scanner (Web-based)

這是一個基於 Web 技術開發的自動車牌掃描器。無需安裝 App，直接透過手機瀏覽器即可實現即時掃描與字元辨識。

[![GitHub Pages](https://img.shields.io/badge/Deployment-GitHub%20Pages-brightgreen)](https://<你的帳號>.github.io/<專案名稱>/)

## ✨ 特點
- **純前端運作**：使用 Tesseract.js，所有計算在用戶端完成，不消耗伺服器資源。
- **響應式設計**：完美適應手機與平板，支援後置鏡頭切換。
- **即時掃描**：具備綠色定位框，引導用戶對準車牌。
- **GitHub Pages 支援**：支援 HTTPS 部署，輕鬆分享測試。

## 🛠️ 技術棧
- **HTML5 / CSS3**: UI 介面設計。
- **JavaScript (ES6)**: 邏輯控制與 Canvas 處理。
- **Tesseract.js**: OCR 核心，用於將車牌影像轉換為文字。

## 🚀 快速開始

1. **Fork** 本專案。
2. 將代碼上傳至你的 GitHub 儲存庫。
3. 前往 `Settings` -> `Pages`。
4. 在 `Branch` 選擇 `main` 並點擊 `Save`。
5. 稍等片刻即可透過 GitHub 提供的 URL 進行訪問。

## 📸 運作原理

1. **鏡頭喚醒**：透過 `navigator.mediaDevices.getUserMedia` 調用手機後置鏡頭。
2. **影像截取**：每隔一段時間將視訊流繪製到 `Canvas` 畫布。
3. **OCR 辨識**：Tesseract.js 對 Canvas 內容進行字元掃描。
4. **過濾正則**：過濾掉雜訊，僅提取符合車牌格式的英數字。



## 📝 注意事項
- **環境要求**：必須在 **HTTPS** 環境下執行（GitHub Pages 已內建）。
- **光線影響**：光線充足且車牌水平時辨識成功率最高。
- **白名單設定**：本專案已設定 `tessedit_char_whitelist`，僅會識別英文字母與數字。

## 🤝 貢獻
歡迎提交 Pull Request 或回報 Issue 以協助改進辨識算法。
