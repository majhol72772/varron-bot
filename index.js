const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

async function startVarronBot() {
    // إدارة الجلسة تلقائياً في سيرفر الاستضافة
    const { state, saveCreds } = await useMultiFileAuthState('session_auth');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // طباعة الـ QR في سجلات السيرفر لمسحه
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('=== كود الـ QR جاهز للمسح في سجلات السيرفر (Logs) ===');
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('انقطع الاتصال.. إعادة المحاولة: ', shouldReconnect);
            if (shouldReconnect) startVarronBot();
        } else if (connection === 'open') {
            console.log('تم اتصال بوت VARRON / HASSAN بنجاح! البوت متصل 24 ساعة.');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // استقبال الأوامر وتفعيلها
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        // أول أمر مبرمج في بوتك الخاص
        if (text === '.تفعيل') {
            await sock.sendMessage(from, { text: 'أهلاً بك! بوت VARRON / HASSAN يعمل بنجاح ومستضاف مجاناً 24/7 ⚡' });
        }
    });
}

startVarronBot();
