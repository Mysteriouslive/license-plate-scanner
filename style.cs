:root {
    --primary-color: #00ff88;
    --bg-dark: #121212;
}

body {
    margin: 0;
    background-color: var(--bg-dark);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: white;
    overflow: hidden;
}

.app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

header {
    padding: 20px;
    text-align: center;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
}

.status-badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    background: #444;
    font-size: 12px;
}

/* 掃描區域容器 */
.scanner-section {
    position: relative;
    flex-grow: 1;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}

video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* 掃描框縮小並置中 */
.scan-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4); /* 背景變暗 */
    display: flex;
    justify-content: center;
    align-items: center;
}

.scan-frame {
    position: relative;
    width: 280px;  /* 寬度縮小 */
    height: 120px; /* 高度縮小 */
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: transparent;
    box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.5); /* 遮罩效果 */
}

/* 四角邊框 */
.corner {
    position: absolute;
    width: 20px;
    height: 20px;
    border: 4px solid var(--primary-color);
}
.top-left { top: -2px; left: -2px; border-right: 0; border-bottom: 0; }
.top-right { top: -2px; right: -2px; border-left: 0; border-bottom: 0; }
.bottom-left { bottom: -2px; left: -2px; border-right: 0; border-top: 0; }
.bottom-right { bottom: -2px; right: -2px; border-left: 0; border-top: 0; }

/* 掃描線動畫 */
.scan-line {
    position: absolute;
    width: 100%;
    height: 2px;
    background: var(--primary-color);
    box-shadow: 0 0 15px var(--primary-color);
    animation: scan MoveLine 2s infinite linear;
}

@keyframes MoveLine {
    0% { top: 0%; }
    100% { top: 100%; }
}

footer {
    padding: 30px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 24px 24px 0 0;
}

.result-box {
    text-align: center;
    margin-bottom: 20px;
}

#plate-number {
    font-size: 32px;
    font-weight: 800;
    color: var(--primary-color);
    letter-spacing: 2px;
    margin-top: 10px;
}

button {
    width: 100%;
    padding: 16px;
    border-radius: 16px;
    border: none;
    background: var(--primary-color);
    color: black;
    font-size: 18px;
    font-weight: bold;
}
