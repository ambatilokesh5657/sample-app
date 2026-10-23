'use strict';

const express = require('express');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const COOKIE_SECURE = process.env.COOKIE_SECURE !== 'false';
const SESSION_MS = 8 * 60 * 60 * 1000;
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!PASSWORD_HASH || !SESSION_SECRET || SESSION_SECRET.length < 32) {
    console.error('ERROR: Set ADMIN_PASSWORD_HASH and a SESSION_SECRET of at least 32 characters.');
    process.exit(1);
}

app.disable('x-powered-by');

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
            imgSrc: ["'self'", 'data:'],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    }
}));

app.use(express.urlencoded({ extended: false, limit: '10kb' }));

const COOKIE_NAME = 'shriram_session';

function sign(value) {
    return crypto.createHmac('sha256', SESSION_SECRET)
        .update(value)
        .digest('base64url');
}

function safeEqual(a, b) {
    const aa = Buffer.from(a);
    const bb = Buffer.from(b);
    return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function makeSession() {
    const payload = Buffer.from(JSON.stringify({
        user: USERNAME,
        exp: Date.now() + SESSION_MS,
        nonce: crypto.randomBytes(16).toString('hex')
    })).toString('base64url');

    return `${payload}.${sign(payload)}`;
}

function getSession(req) {
    const cookies = req.headers.cookie || '';
    const match = cookies.match(/(?:^|;\s*)shriram_session=([^;]+)/);

    if (!match) return null;

    try {
        const token = decodeURIComponent(match[1]);
        const parts = token.split('.');

        if (parts.length !== 2 || !safeEqual(sign(parts[0]), parts[1])) {
            return null;
        }

        const session = JSON.parse(
            Buffer.from(parts[0], 'base64url').toString('utf8')
        );

        if (session.user !== USERNAME ||
            !Number.isFinite(session.exp) ||
            session.exp <= Date.now()) {
            return null;
        }

        return session;
    } catch {
        return null;
    }
}

function setSession(res, token) {
    const attributes = [
        `${COOKIE_NAME}=${encodeURIComponent(token)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${Math.floor(SESSION_MS / 1000)}`
    ];

    if (COOKIE_SECURE) attributes.push('Secure');

    res.setHeader('Set-Cookie', attributes.join('; '));
}

function clearSession(res) {
    const attributes = [
        `${COOKIE_NAME}=`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=0'
    ];

    if (COOKIE_SECURE) attributes.push('Secure');

    res.setHeader('Set-Cookie', attributes.join('; '));
}

function requireLogin(req, res, next) {
    if (!getSession(req)) {
        return res.redirect(303, '/login');
    }

    next();
}

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/login', (req, res) => {
    if (getSession(req)) return res.redirect(303, '/');
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false
}), async (req, res) => {
    const username = typeof req.body.username === 'string'
        ? req.body.username : '';
    const password = typeof req.body.password === 'string'
        ? req.body.password : '';

    let passwordValid = false;

    try {
        passwordValid = await bcrypt.compare(password, PASSWORD_HASH);
    } catch {
        passwordValid = false;
    }

    if (!safeEqual(username, USERNAME) || !passwordValid) {
        return res.status(401).send(
            '<!doctype html><html lang="en"><meta charset="utf-8">' +
            '<meta name="viewport" content="width=device-width,initial-scale=1">' +
            '<title>Sign-in failed</title><body style="font-family:sans-serif;' +
            'text-align:center;padding:3rem"><h2>Sign-in unsuccessful</h2>' +
            '<p>Check your username and password.</p>' +
            '<a href="/login">Try again</a></body></html>'
        );
    }

    setSession(res, makeSession());
    res.redirect(303, '/');
});

app.post('/logout', requireLogin, (req, res) => {
    clearSession(res);
    res.redirect(303, '/login');
});

app.get('/', requireLogin, async (req, res, next) => {
    try {
        let html = await fs.readFile(
            path.join(PUBLIC_DIR, 'index.html'), 'utf8'
        );

        const logoutButton = `
<form method="post" action="/logout"
style="position:fixed;right:15px;bottom:15px;z-index:9999">
<button type="submit"
style="background:#702200;color:white;border:2px solid #d6a542;
border-radius:24px;padding:12px 20px;cursor:pointer;font-weight:bold">
Log out
</button></form>`;

        html = html.replace('</body>', `${logoutButton}\n</body>`);
        res.type('html').send(html);
    } catch (err) {
        next(err);
    }
});

app.use(requireLogin);

app.use(express.static(PUBLIC_DIR, {
    index: false,
    dotfiles: 'deny',
    fallthrough: false
}));

app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err.status === 404) {
        return res.status(404).send('Not found');
    }

    console.error('Request failed:', err.message);
    res.status(500).send('Internal server error');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Shri Ram authentication server listening on port ${PORT}`);
});
