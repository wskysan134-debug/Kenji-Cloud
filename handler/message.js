const { handleCommand } = require('./command');
const { Users, Threads } = require('../database/database');
const config = require('../config/config.json');
const { log } = require('../logger/logger');
const fs = require('fs-extra');
const path = require('path');

const normalizeCommandName = (s) => {
  if (!s) return s;
  return s.trim().toLowerCase().replace(/\s+/g, '_').replace(/–|—|‑/g, '-');
};

const handleMessage = async (event, api, commands) => {
  try {
    if (!['message', 'message_reply', 'event'].includes(event.type)) return;

    let userInfo = {};
    let threadInfo = {};
    try {
      if (event.senderID) userInfo = await api.getUserInfo(event.senderID);
      if (event.threadID) threadInfo = await api.getThreadInfo(event.threadID);
    } catch (err) {
      log('warn', `تعذر جلب معلومات المستخدم/المجموعة: ${err.message}`);
    }

    const userName = userInfo[event.senderID]?.name || 'مستخدم غير معروف';
    const threadName = threadInfo?.name || 'مجموعة غير معروفة';

    if (event.senderID) Users.create(event.senderID, userName);
    if (event.threadID) Threads.create(event.threadID, threadName);

    const userData = event.senderID ? Users.get(event.senderID) : {};
    const threadData = event.threadID ? Threads.get(event.threadID) : {};

    if (event.senderID) {
      userData.name = userName;
      userData.messageCount = (userData.messageCount || 0) + 1;
      userData.lastActive = new Date().toISOString();

      const xpToGive = Math.floor(Math.random() * 10) + 5;
      userData.xp = (userData.xp || 0) + xpToGive;
      userData.totalxp = (userData.totalxp || 0) + xpToGive;
      const requiredXp = 5 * Math.pow((userData.rank || 0) + 1, 2);
      if (userData.xp >= requiredXp) {
        userData.rank = (userData.rank || 0) + 1;
        userData.xp -= requiredXp;
      }
      Users.set(event.senderID, userData);
    }

    if (event.threadID) {
      threadData.name = threadName;
      Threads.set(event.threadID, threadData);
    }

    const body = event.body || '';
    const isGroup = event.isGroup || false;
    const messageType = event.attachments && event.attachments.length > 0 ? 'وسائط' : 'نص';
    let mediaUrl = 'غير متوفر';
    if (event.attachments && event.attachments.length > 0) {
      mediaUrl = event.attachments[0].url || 'غير متوفر';
    } else if (event.senderID) {
      mediaUrl = `https://graph.facebook.com/${event.senderID}/picture?width=512&height=512&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`;
    }
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const logMessage = `${time} - ${userName} (${isGroup ? 'مجموعة' : 'خاص'}) - النوع: ${messageType} - الرسالة: ${body} - رابط الوسائط: ${mediaUrl}`;
    log('info', logMessage);

    if (event.messageReply && global.client?.handleReply) {
      const { handleReply } = global.client;
      const reply = handleReply.find(r => r.messageID === event.messageReply.messageID);
      if (reply) {
        const command = global.client.commands.get(reply.name);
        if (command && command.handleReply) {
          await command.handleReply({ event, api, handleReply: reply });
        }
      }
    }

    const currentPrefix = threadData?.settings?.prefix || config.prefix;
    const commandsList = global.client.commands;

    // أوامر بدون بادئة
    const commandToken = body.split(' ')[0] || '';
    const normalizedToken = normalizeCommandName(commandToken.toLowerCase());
    const noPrefixCommand = commandsList.get(normalizedToken) || Array.from(commandsList.values()).find(cmd => cmd.config.aliases?.map(a => normalizeCommandName(a.toLowerCase())).includes(normalizedToken));
    if (noPrefixCommand && noPrefixCommand.config.prefix === false) {
      const args = body.trim().split(/\s+/);
      if (args.length === 0) return;
      await handleCommand({ message: body, args, event, api, Users, Threads, commands: commandsList, config: global.client.config });
      return;
    }

    // أوامر بالبادئة
    if (body.startsWith(currentPrefix)) {
      const args = body.slice(currentPrefix.length).trim().split(/\s+/);
      if (args.length === 0) return;
      // طبعًا handleCommand سيبحث في الخريطة (وتوجد المفاتيح العربية هناك)
      await handleCommand({ message: body, args, event, api, Users, Threads, commands: commandsList, config: global.client.config });
    }
  } catch (error) {
    log('error', `خطأ في معالجة الرسالة: ${error.message}`);
  }
};

module.exports = { handleMessage };
