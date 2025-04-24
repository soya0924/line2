document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('waveCanvas');
    const ctx = canvas.getContext('2d');
    const connectButton = document.getElementById('connectButton');
    
    let port;
    let reader;
    let rotationSpeed = 0.02;
    let time = 0;
    
    const waves = {
        wave1: {
            amplitude: 60,
            frequency: 0.02,
            phase: 0,
            color: '#FF6B6B',
            offsetY: -15
        },
        wave2: {
            amplitude: 60,
            frequency: 0.02,
            phase: Math.PI,
            color: '#4ECDC4',
            offsetY: 15
        }
    };

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
                    rotationSpeed = 0.01 + (potValue / 1023) * 0.09;
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
        
        Object.values(waves).forEach(wave => {
            ctx.beginPath();
            ctx.strokeStyle = wave.color;
            ctx.lineWidth = 3;

            const path = new Path2D();
            let firstPoint = true;

            for (let x = 0; x < canvas.width; x += 3) {
                const baseY = Math.sin(x * wave.frequency + wave.phase + time) * wave.amplitude;
                const rotationY = Math.sin(time * 0.8) * 40;
                const rotationX = Math.cos(time * 0.8) * 15;
                
                const y = baseY + rotationY + canvas.height / 2 + wave.offsetY;
                const adjustedX = x + rotationX;

                if (firstPoint) {
                    path.moveTo(adjustedX, y);
                    firstPoint = false;
                } else {
                    const prevX = x - 3;
                    const prevY = Math.sin(prevX * wave.frequency + wave.phase + time) * wave.amplitude +
                                rotationY + canvas.height / 2 + wave.offsetY;
                    const cpX = (adjustedX + prevX) / 2;
                    path.quadraticCurveTo(cpX, prevY, adjustedX, y);
                }
            }
            
            ctx.stroke(path);

            for (let x = 0; x < canvas.width; x += 60) {
                const y1 = Math.sin(x * waves.wave1.frequency + waves.wave1.phase + time) * waves.wave1.amplitude +
                          Math.sin(time * 0.8) * 40 + canvas.height / 2 + waves.wave1.offsetY;
                          
                const y2 = Math.sin(x * waves.wave2.frequency + waves.wave2.phase + time) * waves.wave2.amplitude +
                          Math.sin(time * 0.8) * 40 + canvas.height / 2 + waves.wave2.offsetY;

                const adjustedX = x + Math.cos(time * 0.8) * 15;

                ctx.beginPath();
                ctx.strokeStyle = `rgba(168, 230, 207, 0.4)`;
                ctx.lineWidth = 1;
                
                const controlPoint = {
                    x: adjustedX,
                    y: (y1 + y2) / 2
                };
                
                ctx.beginPath();
                ctx.moveTo(adjustedX, y1);
                ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, adjustedX, y2);
                ctx.stroke();
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