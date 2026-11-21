const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')
const axios = require('axios')

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) console.log('QR:', qr)
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed, reconnecting:', shouldReconnect)
            if (shouldReconnect) start()
        } else if (connection === 'open') {
            console.log('✅ Bot Connected!')
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        const from = m.key.remoteJid
        const text = m.message.conversation || m.message.extendedTextMessage?.text || ''
        const cmd = text.trim().toLowerCase()

        if (cmd === 'هاي' || cmd === 'hi' || cmd === 'السلام عليكم') {
            await sock.sendMessage(from, { text: 'اهلا بيك يا صاحبي 🔥 انا البوت بتاعك شغال!' })
        }
        else if (cmd.startsWith('صورة ')) {
            const prompt = text.slice(5)
            await sock.sendMessage(from, { text: 'ثواني بعملك الصورة... ⏳' })
            try {
                const res = await axios.get(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`, { responseType: 'arraybuffer' })
                await sock.sendMessage(from, { image: Buffer.from(res.data), caption: 'اتفضل يا معلم ✨' })
            } catch (e) {
                await sock.sendMessage(from, { text: 'حصل مشكلة في الصورة، جرب تاني' })
            }
        }
        else if (cmd === 'منيو' || cmd === 'menu') {
            await sock.sendMessage(from, { text: 'اوامر البوت:\n\n- هاي : للترحيب\n- صورة + الوصف : يعملك صورة\n- منيو : القايمة دي' })
        }
    })
}
start()
