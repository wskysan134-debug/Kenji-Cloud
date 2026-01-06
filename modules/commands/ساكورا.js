const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

module.exports = {
  config: {
    name: 'ساكورا',
    version: '3.0',
    author: 'Hridoy',
    countDown: 5,
    prefix: false,
    description: 'AI assistant with full control: create, modify, delete any bot commands',
    category: 'ai',
    guide: {
      en: '{pn} <message>\nExamples:\n- ساكورا Hello\n- ساكورا عدلي امر مثل uptime.js\n- ساكورا اصنعي امر مثل لعبة'
    },
    developerOnly: false // أي شخص عنده صلاحيات البوت يقدر يستخدمه
  },

  onStart: async ({ event, args, api }) => {
    const input = args.join(' ').trim();
    if (!input) return api.sendMessage('الرجاء إدخال رسالة أو أمر.', event.threadID, event.messageID);

    const configPath = path.resolve(__dirname, '../../config/config.json');
    let language = 'en';
    try {
      if (fs.existsSync(configPath)) {
        const config = await fs.readJSON(configPath);
        if (config.language) language = config.language;
      }
    } catch (err) {
      console.error('[Sakura] Error reading config file:', err.message);
    }

    const aiProcess = async (command) => {
      const apiUrl = `https://simsim-nexalo.vercel.app/api/chat/${encodeURIComponent(command)}/${language}`;
      try {
        const response = await axios.get(apiUrl);
        if (response.data && response.data.answer) return response.data.answer;
        return "لا أملك جواب لهذا، يمكنك تدريبي!";
      } catch (error) {
        console.error('[Sakura AI] Error:', error.message);
        return `حدث خطأ أثناء معالجة الأمر: ${error.message}`;
      }
    };

    const commandsDir = path.resolve(__dirname, 'commands');
    fs.ensureDirSync(commandsDir);

    // تعديل أمر موجود
    if (input.startsWith('عدلي امر مثل')) {
      const fileName = input.replace('عدلي امر مثل', '').trim();
      const filePath = path.resolve(commandsDir, fileName);
      if (!fs.existsSync(filePath)) return api.sendMessage(`الملف ${fileName} غير موجود!`, event.threadID, event.messageID);
      
      try {
        let code = await fs.readFile(filePath, 'utf-8');
        const newCode = await aiProcess(`عدل هذا الكود ليعمل بشكل صحيح:\n${code}`);
        await fs.writeFile(filePath, newCode, 'utf-8');
        return api.sendMessage(`تم تعديل الأمر بنجاح: ${fileName}`, event.threadID, event.messageID);
      } catch (err) {
        return api.sendMessage(`خطأ أثناء تعديل الأمر: ${err.message}`, event.threadID, event.messageID);
      }
    }

    // إنشاء أمر جديد
    if (input.startsWith('اصنعي امر مثل')) {
      const commandDesc = input.replace('اصنعي امر مثل', '').trim();
      const newCommandCode = await aiProcess(`اصنع لي كود بوت فيسبوك ماسنجر لأمر يقوم بـ: ${commandDesc}`);
      const safeName = commandDesc.split(' ')[0].replace(/[^a-zA-Z0-9_-]/g, '') || 'newCommand';
      const newFilePath = path.resolve(commandsDir, `${safeName}.js`);

      try {
        await fs.writeFile(newFilePath, newCommandCode, 'utf-8');
        return api.sendMessage(`تم إنشاء الأمر الجديد: ${safeName}.js`, event.threadID, event.messageID);
      } catch (err) {
        return api.sendMessage(`خطأ أثناء إنشاء الأمر: ${err.message}`, event.threadID, event.messageID);
      }
    }

    // حذف أمر موجود
    if (input.startsWith('احذف امر')) {
      const fileName = input.replace('احذف امر', '').trim();
      const filePath = path.resolve(commandsDir, fileName);
      if (!fs.existsSync(filePath)) return api.sendMessage(`الملف ${fileName} غير موجود!`, event.threadID, event.messageID);

      try {
        await fs.remove(filePath);
        return api.sendMessage(`تم حذف الأمر: ${fileName}`, event.threadID, event.messageID);
      } catch (err) {
        return api.sendMessage(`خطأ أثناء حذف الأمر: ${err.message}`, event.threadID, event.messageID);
      }
    }

    // أي رسالة أخرى تذهب للذكاء الاصطناعي
    const aiReply = await aiProcess(input);
    return api.sendMessage(aiReply, event.threadID, event.messageID);
  }
};
