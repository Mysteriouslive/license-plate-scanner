:root {
    --primary-color: #00ff88; /* 螢光綠 */
    --accent-color: #00e5ff;  /* 科技藍 */
    --bg-deep: #0a0a0a;       /* 純深黑 */
    --bg-card: #1a1a1a;       /* 深灰色區塊 */
    --text-main: #e0e0e0;
}

body {
    margin: 0;
    background-color: var(--bg-deep);
    font-family: 'Segoe UI', Roboto, sans-serif;
    color: var(--text-main);
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
    background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
    position: absolute;
    top: 0;
    width: 100%;
    z-index: 10;
}

h2 {
    margin: 0;
    font-size: 1.2rem;
    letter-spacing: 2px;
    color: var(--accent-color);
    text-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
}

.status-badge {
    display: inline-block;
    margin-top: 8px;
    padding: 3px 15px;
    border-radius: 30px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 11px;
    color: #888;
}

/* 掃描區域 */
.scanner-section {
    position: relative;
    flex-grow: 1;
    display: flex;
    justify-content: center;
    align-items: center;
}

video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* 強化遮罩：除了中間框框外，其餘全黑透光 */
.scan-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
}

.scan-frame {
    position: relative;
    width: 280px;  
    height: 140px; 
    /* 使用巨大的 box-shadow 遮住周圍 */
    box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.7); 
    border: 1px solid rgba(0, 255, 136, 0.3);
}

/* 霓虹燈角線 */
.corner {
    position: absolute;
    width: 25px;
    height: 25px;
    border: 3px solid var(--primary-color);
    filter: drop-shadow(0 0 5px var(--primary-color));
}
.top-left { top: -3px; left: -3px; border-right: 0; border-bottom: 0; }
.top-right { top: -3px; right: -3px; border-left: 0; border-bottom: 0; }
.bottom-left { bottom: -3px; left: -3px; border-right: 0; border-top: 0; }
.bottom-right { bottom: -3px; right: -3px; border-left: 0; border-top: 0; }

/* 掃描線改為藍綠色漸層 */
.scan-line {
    position: absolute;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
    animation: scan MoveLine 2.5s infinite ease-in-out;
}

@keyframes MoveLine {
    0% { top: 0%; opacity: 0; }
    50% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
}

/* 底部結果區 */
footer {
    padding: 25px;
    background: var(--bg-card);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 -10px 30px rgba(0,0,0,0.5);
}

.result-box {
    text-align: center;
    margin-bottom: 20px;
}

small {
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1px;
}

#plate-number {
    font-size: 36px;
    font-weight: 900;
    color: var(--primary-color);
    text-shadow: 0 0 20px rgba(0, 255, 136, 0.4);
    font-family: 'Courier New', Courier, monospace;
}

button {
    width: 100%;
    padding: 18px;
    border-radius: 12px;
    border: none;
    background: linear-gradient(45deg, var(--accent-color), var(--primary-color));
    color: #000;
    font-size: 18px;
    font-weight: 800;
    transition: transform 0.2s;
}

button:active {
    transform: scale(0.98);
}
