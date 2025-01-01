const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const BLOCK_TIME = 15 * 60 * 1000;

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function checkLoginAttempts(ip) {
    const attempts = loginAttempts.get(ip) || [];
    const now = Date.now();
    
    const recentAttempts = attempts.filter(time => (now - time) < BLOCK_TIME);
    loginAttempts.set(ip, recentAttempts);
    
    return recentAttempts.length >= MAX_ATTEMPTS;
}

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip;

    if (checkLoginAttempts(ip)) {
        return res.status(429).json({ 
            error: 'Muitas tentativas. Aguarde 15 minutos.' 
        });
    }

    if (username === 'admin' && password === 'admin123') {
        const token = generateToken();
        return res.json({ token });
    }

    const attempts = loginAttempts.get(ip) || [];
    attempts.push(Date.now());
    loginAttempts.set(ip, attempts);

    res.status(401).json({ error: 'Credenciais inválidas' });
});

function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }


    next();
}

module.exports = { router, verifyToken }; 