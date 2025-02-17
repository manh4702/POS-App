interface IpcRenderer {
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, func: (...args: any[]) => void) => void;
}

interface ElectronAPI {
    openPaymentWindow: () => void;
    ipcRenderer: IpcRenderer;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}

export {}; 