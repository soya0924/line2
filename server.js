const WebSocket = require('ws');
const SerialPort = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

// 建立 WebSocket 伺服器
const wss = new WebSocket.Server({ port: 8080 });

// Arduino 序列埠設定（需要根據您的系統修改 COM 埠）
const port = new SerialPort.SerialPort({
    path: '/dev/tty.usbmodem1101', // Mac OS X 上的 Arduino 序列埠，需要根據實際情況修改
    baudRate: 9600
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// 當 WebSocket 客戶端連接時
wss.on('connection', function connection(ws) {
    console.log('新的客戶端連接');

    // 監聽來自 Arduino 的數據
    parser.on('data', function(data) {
        // 發送數據給所有連接的客戶端
        ws.send(data);
    });
});

console.log('WebSocket 伺服器運行在 ws://localhost:8080');