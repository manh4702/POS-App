const { contextBridge, ipcRenderer } = require('electron');

// Log để debug
console.log('Preload script starting...');

try {
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
            isElectron: true
        }
    );
    console.log('Preload script completed successfully');
} catch (error) {
    console.error('Error in preload script:', error);
} 