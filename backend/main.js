const { app: electronApp, BrowserWindow, session, protocol, ipcMain } = require('electron');
const path = require('path');
const isDev = !electronApp.isPackaged;
const { createDbConnection } = require('./database');
const setupServer = require('./server');
const { createPaymentWindow, getPaymentWindow } = require('./windows/paymentWindow');

let mainWindow = null;
let db = null;
let server = null;

async function initializeServer() {
    try {
        db = await createDbConnection();
        const app = setupServer(db);
        
        return new Promise((resolve, reject) => {
            const port = process.env.PORT || 3001;
            server = app.listen(port, '127.0.0.1', () => {
                console.log(`Server running at http://localhost:${port}`);
                resolve(true);
            });

            server.on('error', (error) => {
                console.error('Server error:', error);
                reject(error);
            });
        });
    } catch (error) {
        console.error('Failed to initialize server:', error);
        return false;
    }
}

async function createWindow() {
    try {
        await initializeServer();

        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
                webSecurity: false
            }
        });

        console.log('Is Dev:', isDev);
        
        if (isDev) {
            await mainWindow.loadURL('http://localhost:3000');
            mainWindow.webContents.openDevTools();
        } else {
            const indexPath = path.join(__dirname, 'app', 'index.html');
            console.log('Loading index from:', indexPath);
            
            protocol.registerFileProtocol('file', (request, callback) => {
                const filePath = request.url.replace('file:///', '');
                const resolvedPath = path.resolve(__dirname, 'app', filePath);
                callback({ path: resolvedPath });
            });

            try {
                await mainWindow.loadFile(indexPath);
                mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
                    console.error('Failed to load:', errorCode, errorDescription);
                });
                
                mainWindow.webContents.on('console-message', (event, level, message) => {
                    console.log('Renderer Console:', message);
                });
            } catch (error) {
                console.error('Error loading file:', error);
            }
        }

    } catch (error) {
        console.error('Error creating window:', error);
        electronApp.quit();
    }
}

protocol.registerSchemesAsPrivileged([
    {
        scheme: 'file',
        privileges: {
            secure: true,
            standard: true,
            supportFetchAPI: true,
            stream: true
        }
    }
]);

electronApp.whenReady().then(createWindow);

electronApp.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        if (server) server.close();
        if (db) db.close();
        electronApp.quit();
    }
});

electronApp.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

ipcMain.on('open-payment-window', () => {
    const existingWindow = getPaymentWindow();
    if (existingWindow) {
        existingWindow.focus();
    } else {
        createPaymentWindow();
    }
});
