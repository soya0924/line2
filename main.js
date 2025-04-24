document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('waveCanvas');
    const ctx = canvas.getContext('2d');
    const connectButton = document.getElementById('connectButton');
    
    let port;
    let reader;
    let rotationSpeed = 0.02;
    let targetRotationSpeed = 0.02;
    let time = 0;
    let speedTransitionPhase = 0;  // 用於控制速度變化的相位
    const MIN_SPEED = 0.0005;      // 最小速度
    const MAX_SPEED = 0.08;        // 最大速度
    const SPEED_CYCLE_DURATION = 3; // 完整循環的時間（秒）
    
    const waves = {
        wave1: {
            amplitude: 100,  // 增加基本振幅
            frequency: 0.015,  // 降低頻率使動畫更柔和
            phase: 0,
            color: '#FF6B6B',
            offsetY: -25,  // 增加偏移量
            offsetX: 0  // 添加水平偏移
        },
        wave2: {
            amplitude: 100,  // 增加基本振幅
            frequency: 0.015,  // 降低頻率使動畫更柔和
            phase: Math.PI,
            color: '#4ECDC4',
            offsetY: 25,   // 增加偏移量
            offsetX: 0  // 添加水平偏移
        }
    };

    function lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    function easeInOutCubic(x) {
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    async function connectToArduino() {
        try {
            port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });
            
            connectButton.textContent = '已連接';
            connectButton.style.background = '#666';
            connectButton.disabled = true;

            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
            const reader = textDecoder.readable.getReader();

            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    reader.releaseLock();
                    break;
                }
                const potValue = parseInt(value);
                if (!isNaN(potValue)) {
                    // 使用電阻值來影響速度循環的速率
                    const cycleSpeedMultiplier = 1 + (potValue / 1023) * 2; // 範圍從 1 到 3
                    speedTransitionPhase += 0.016 / SPEED_CYCLE_DURATION * cycleSpeedMultiplier; // 假設 60fps
                    
                    if (speedTransitionPhase >= 1) {
                        speedTransitionPhase = 0;
                    }

                    // 使用 easeInOutCubic 來創造更自然的速度變化
                    const cyclicValue = easeInOutCubic(Math.sin(speedTransitionPhase * Math.PI * 2) * 0.5 + 0.5);
                    
                    // 在接近最小速度時使用指數函數來創造更明顯的減速效果
                    const speedRatio = cyclicValue < 0.3 
                        ? Math.pow(cyclicValue / 0.3, 2) * 0.3 
                        : cyclicValue;
                    
                    targetRotationSpeed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * speedRatio;
                }
            }
        } catch (error) {
            console.error('連接錯誤:', error);
            connectButton.textContent = '重試連接';
            connectButton.style.background = '#f44336';
            connectButton.disabled = false;
        }
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function drawDNAWave() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 使用更平滑的過渡效果
        rotationSpeed = lerp(rotationSpeed, targetRotationSpeed, 0.1);

        // 根據當前速度調整移動距離
        const moveSpeedMultiplier = rotationSpeed < 0.01 ? 40 : 30;  // 慢速時增加移動係數
        const moveSpeed = rotationSpeed * moveSpeedMultiplier;
        waves.wave1.offsetX -= moveSpeed;
        waves.wave2.offsetX -= moveSpeed;

        // 當完全移出畫面時重置位置
        if (waves.wave1.offsetX < -canvas.width) {
            waves.wave1.offsetX = 0;
            waves.wave2.offsetX = 0;
        }
        
        Object.values(waves).forEach(wave => {
            ctx.beginPath();
            ctx.strokeStyle = wave.color;
            ctx.lineWidth = 3;

            const path = new Path2D();
            let firstPoint = true;

            for (let x = 0; x < canvas.width * 2; x += 3) {  // 擴大繪製範圍
                const waveAmplitude = wave.amplitude * (1 + Math.sin(time * 0.5) * 0.2);
                const baseY = Math.sin(x * wave.frequency + wave.phase + time) * waveAmplitude;
                const rotationY = Math.sin(time * 0.8) * 60;
                
                // 加入水平偏移計算
                const adjustedX = x + wave.offsetX;
                
                // 只繪製在可見區域內的部分
                if (adjustedX >= 0 && adjustedX <= canvas.width) {
                    const y = baseY + rotationY + canvas.height / 2 + wave.offsetY;

                    if (firstPoint) {
                        path.moveTo(adjustedX, y);
                        firstPoint = false;
                    } else {
                        const prevX = x - 3 + wave.offsetX;
                        const prevY = Math.sin((x - 3) * wave.frequency + wave.phase + time) * waveAmplitude +
                                    rotationY + canvas.height / 2 + wave.offsetY;
                        const cpX = (adjustedX + prevX) / 2;
                        path.quadraticCurveTo(cpX, prevY, adjustedX, y);
                    }
                }
            }
            
            ctx.stroke(path);

            // DNA 連接線和圓點
            for (let x = 0; x < canvas.width * 2; x += 60) {  // 擴大繪製範圍
                const adjustedX = x + waves.wave1.offsetX;
                
                // 只繪製在可見區域內的部分
                if (adjustedX >= 0 && adjustedX <= canvas.width) {
                    const waveAmplitude = wave.amplitude * (1 + Math.sin(time * 0.5) * 0.2);
                    const y1 = Math.sin(x * waves.wave1.frequency + waves.wave1.phase + time) * waveAmplitude +
                              Math.sin(time * 0.8) * 60 + canvas.height / 2 + waves.wave1.offsetY;
                              
                    const y2 = Math.sin(x * waves.wave2.frequency + waves.wave2.phase + time) * waveAmplitude +
                              Math.sin(time * 0.8) * 60 + canvas.height / 2 + waves.wave2.offsetY;

                    // 繪製連接線
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(168, 230, 207, 0.4)`;
                    ctx.lineWidth = 1;
                    ctx.moveTo(adjustedX, y1);
                    ctx.lineTo(adjustedX, y2);
                    ctx.stroke();

                    // 在連接線上添加跳動的圓點
                    const numDots = 3; // 每條連接線上的圓點數量
                    for (let i = 0; i < numDots; i++) {
                        // 計算圓點在連接線上的位置（0-1之間）
                        const dotPosition = (Math.sin(time * 3 + i * Math.PI * 2 / numDots) + 1) / 2;
                        
                        // 計算圓點的實際座標
                        const dotX = adjustedX;
                        const dotY = y1 + (y2 - y1) * dotPosition;
                        
                        // 計算圓點大小（添加跳動效果）
                        const dotSize = 3 + Math.sin(time * 5 + i * Math.PI * 2 / numDots) * 1;
                        
                        // 繪製圓點
                        ctx.beginPath();
                        ctx.fillStyle = '#A8E6CF';
                        ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        });

        time += rotationSpeed;
        requestAnimationFrame(drawDNAWave);
    }

    connectButton.addEventListener('click', connectToArduino);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    drawDNAWave();
});