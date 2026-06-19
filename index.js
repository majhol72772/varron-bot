const { makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const readline = require('readline');

// إعداد واجهة لقراءة المدخلات من السيرفر إذا لزم الأمر
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startVarronBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session_auth');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // تعطيل طباعة الـ QR Code تماماً
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"] // ضروري لتعريف السيرفر كمتصفح متوافق مع كود الربط
    });

    // تفعيل طلب كود الرمز المكون من 8 أرقام إذا لم يكن البوت مسجلاً مسبقاً
    if (!sock.authState.creds.registered) {
        await delay(3000); // الانتظار قليلاً لتهيئة الاتصال
        
        // ==========================================
        // ضع رقم هاتف البوت الخاص بك هنا مع رمز الدولة (بدون علامة + أو أصفار إضافية)
        // مثال لرقـم مغربي: "2126xxxxxxxx"
        // ==========================================
        const phoneNumber = "212617202843"; 

        try {
            let code = await sock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(`\n==========================================\n`);
            console.log(`كود الربط المكون من 8 أرقام لبوت VARRON هو: ${code}`);
            console.log(`\n==========================================\n`);
        } catch (error) {
            console.log("حدث خطأ أثناء طلب كود الـ Pairing:", error);
        }
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('انقطع الاتصال.. إعادة المحاولة: ', shouldReconnect);
            if (shouldReconnect) startVarronBot();
        } else if (connection === 'open') {
            console.log('تم اتصال بوت VARRON / HASSAN بنجاح عبر الكود! 🎉');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (text === '.تفعيل') {
            await sock.sendMessage(from, { text: 'أهلاً بك! بوت VARRON / HASSAN يعمل بنجاح ومستضاف مجاناً 24/7 ⚡' });
        }
    });
}

startVarronBot();
