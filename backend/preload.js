const { contextBridge, ipcRenderer } = require('electron');

// Kiểm tra xem có đang chạy trong Electron không
const isElectron = process.versions.electron !== undefined;

if (isElectron) {
    // Đảm bảo API được expose chỉ khi đang chạy trong Electron
    contextBridge.exposeInMainWorld(
        'electron',
        {
            openPaymentWindow: () => {
                console.log('Sending open-payment-window event');
                ipcRenderer.send('open-payment-window');
            },
            ipcRenderer: {
                send: (channel, data) => {
                    ipcRenderer.send(channel, data);
                },
                on: (channel, func) => {
                    ipcRenderer.on(channel, (event, ...args) => func(...args));
                }
            },
            // Thêm flag để kiểm tra môi trường
            isElectron: true
        }
    );

    console.log('Preload script loaded in Electron environment');
} else {
    console.log('Not running in Electron environment');
} 