body { font-family: -apple-system, sans-serif; background: #1a1a1a; color: white; margin: 0; }
.container { display: flex; flex-direction: column; align-items: center; padding: 20px; }
.video-wrapper { position: relative; width: 100%; max-width: 400px; border-radius: 12px; overflow: hidden; }
video { width: 100%; display: block; }
.scan-region { 
    position: absolute; top: 35%; left: 10%; width: 80%; height: 30%;
    border: 2px solid #00E676; box-shadow: 0 0 15px rgba(0,230,118,0.5); border-radius: 8px;
}
.result-card { background: #333; width: 100%; max-width: 400px; margin-top: 20px; padding: 15px; border-radius: 10px; text-align: center; }
#plate-number { font-size: 2rem; font-weight: bold; color: #00E676; letter-spacing: 2px; margin-top: 5px; }
button { background: #007AFF; color: white; border: none; padding: 12px 30px; border-radius: 25px; font-size: 1rem; margin-top: 10px; }
