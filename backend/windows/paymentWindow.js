const { BrowserWindow } = require('electron');
const path = require('path');
const isDev = !require('electron').app.isPackaged;

let paymentWindow = null;

function createPaymentWindow() {
    paymentWindow = new BrowserWindow({
        width: 1600,  // Kích thước lớn hơn
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
            webSecurity: false,
            sandbox: false
        },
        title: 'Màn hình thanh toán'
    });

    // Log để debug
    console.log('Payment window created');

    // Load URL
    if (isDev) {
        paymentWindow.loadURL('http://localhost:3000/payment');
    } else {
        // Sửa đường dẫn để load file từ resources
        paymentWindow.loadFile(path.join(process.resourcesPath, 'frontend/build/index.html'), {
            hash: 'payment'
        });
    }

    // Mở DevTools trong môi trường development
    if (isDev) {
        paymentWindow.webContents.openDevTools();
    }

    paymentWindow.on('closed', () => {
        paymentWindow = null;
    });

    return paymentWindow;
}

module.exports = {
    createPaymentWindow,
    getPaymentWindow: () => paymentWindow
}; 