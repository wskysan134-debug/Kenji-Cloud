const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

/* ===============================
   1) قاموس تعريب الأوامر
================================ */
const commandTranslations = {
  "help": "قائمة",
  "commands": "قائمة",
  "list": "قائمة",

  "create": "اصنعي امر مثل",
  "make": "اصنعي امر مثل",
  "new": "اصنعي امر مثل",

  "edit": "عدلي امر مثل",
  "update": "عدلي امر مثل",

  "delete": "احذف امر",
  "remove": "احذف امر"
};

// تعريب الأوامر
function translateCommand(text) {
  let result = text;
  for (const key in commandTranslations) {
    const reg = new RegExp(`^${key}`, "i");
    if (reg.test(result)) {
      result = result.replace(reg, commandTranslations[key]);
      break;
    }
  }
  return result;
}

/* ===============================
   2) مترجم عام لأي نص → عربي
   (يستخدم نفس API)
================================ */
async function translateToArabic(text) {
  try {
    const prompt = `ترجم النص التالي إلى اللغة العربية فقط بدون شرح:\n${text}`;
    const apiUrl = `https://simsim-nexalo.vercel.app/api/chat/${encodeURIComponent(prompt)}/ar`;
    const res = await axios.get(apiUrl);
    if (res.data && res.data.answer) return res.data.answer;
    return text;
  } catch (e) {
    console.error('[Translator] Error:', e.message);
    return text; // لو فشل نرجع النص الأصلي
  }
}

module.exports = {
  config: {
    name: 'ساكورا',
    version: '6.0',
    author: 'Hridoy + Arabized',
    countDown: 5,
    prefix: false,
    description: 'AI assistant fully arabized + girl personality',
    category: 'ai',
    guide: {
      en: '{pn} <message>\nExamples:\n- ساكورا Hello\n- ساكورا عدلي امر مثل uptime.js\n- ساكورا اصنعي امر مثل لعبة\n- ساكورا احذف امر uptime.js\n- ساكورا قائمة'
    },
    developerOnly: false
  },

  onStart: async ({ event, args, api }) => {
    let input = args.join(' ').trim();
    if (!input)
      return api.sendMessage('الرجاء إدخال رسالة أو أمر.', event.threadID, event.messageID);

    // 🔁 تعريب الأوامر تلقائيًا
    input = translateCommand(input);

    /* ===============================
       3) أمر القائمة
    ================================ */
    if (input === 'قائمة') {
      const helpMessage = `
🌟 --- أوامر البوت ---
[الدردشة] 🤖
- ساكورا <رسالة> → الرد عليك مباشرة كشخصية AI بنت ودودة (عربي)

[إنشاء الأوامر] ✨
- ساكورا اصنعي امر مثل <وصف>

[تعديل الأوامر] 🛠️
- ساكورا عدلي امر مثل <ملف>

[حذف الأوامر] ❌
- ساكورا احذف امر <ملف>
-----------------------
      `;
      return api.sendMessage(helpMessage, event.threadID, event.messageID);
    }

    /* ===============================
       4) إعداد اللغة = عربي دائمًا
    ================================ */
    const language = 'ar';

    /* ===============================
       5) الذكاء الاصطناعي (عربي فقط)
    ================================ */
    const aiProcess = async (command) => {
      const prompt = `
أنت شخصية فتاة لطيفة اسمها "ساكورا".
تتكلمين دائمًا باللغة العربية فقط.
أسلوبك ودود ومرح وتحبين مساعدة المستخدم.
الرسالة من المستخدم:
"${command}"
      `;
      const apiUrl = `https://simsim-nexalo.vercel.app/api/chat/${encodeURIComponent(prompt)}/${language}`;
      try {
        const response = await axios.get(apiUrl);
        if (response.data && response.data.answer) {
          // لو الرد طلع إنجليزي بالغلط نعرّبه
          return await translateToArabic(response.data.answer);
        }
        return "ما قدرت أفهم سؤالك، ممكن توضحه لي أكتر؟ 😊";
      } catch (error) {
        console.error('[Sakura AI] Error:', error.message);
        return `حصل خطأ تقني، حاول مرة تانية لاحقًا 🙏`;
      }
    };

    const commandsDir = path.resolve(__dirname, '../../commands');
    fs.ensureDirSync(commandsDir);

    /* ===============================
       6) تعديل أمر موجود
    ================================ */
    if (input.startsWith('عدلي امر مثل')) {
      const fileName = input.replace('عدلي امر مثل', '').trim();
      const filePath = path.resolve(commandsDir, fileName);

      if (!fs.existsSync(filePath))
        return api.sendMessage(`الملف ${fileName} غير موجود!`, event.threadID, event.messageID);

      try {
        let code = await fs.readFile(filePath, 'utf-8');
        const newCode = await aiProcess(`عدلي هذا الكود ليعمل بشكل صحيح:\n${code}`);

        if (!newCode || !newCode.includes('module.exports'))
          return api.sendMessage('لم أستطع توليد كود صالح للتعديل 😥', event.threadID, event.messageID);

        await fs.writeFile(filePath, newCode, 'utf-8');
        return api.sendMessage(`تم تعديل الأمر بنجاح: ${fileName} ✅`, event.threadID, event.messageID);
      } catch (err) {
        return api.sendMessage(`حصل خطأ أثناء التعديل: ${err.message}`, event.threadID, event.messageID);
      }
    }

    /* ===============================
       7) إنشاء أمر جديد
    ================================ */
    if (input.startsWith('اصنعي امر مثل')) {
      const commandDesc = input.replace('اصنعي امر مثل', '').trim();
      const newCommandCode = await aiProcess(
        `اصنعي كود لبوت فيسبوك ماسنجر لأمر يقوم بالآتي:\n${commandDesc}`
      );

      const safeName =
        commandDesc.split(' ')[0].replace(/[^a-zA-Z0-9_-]/g, '') || 'newCommand';

      const newFilePath = path.resolve(commandsDir, `${safeName}.js`);

      if (!newCommandCode || !newCommandCode.includes('module.exports'))
        return api.sendMessage('لم أستطع إنشاء كود صالح 😥', event.threadID, event.messageID);

      try {
        await fs.writeFile(newFilePath, newCommandCode, 'utf-8');
        return api.sendMessage(`تم إنشاء الأمر الجديد: ${safeName}.js 🎉`, event.threadID, event.messageID);
      } catch (err) {
        return api.sendMessage(`حصل خطأ أثناء الإنشاء: ${err.message}`, event.threadID, event.messageID);
      }
    }

    /* ===============================
       8) حذف أمر
    ================================ */
    if (input.startsWith('احذف امر')) {
      const fileName = input.replace('احذف امر', '').trim();
      const filePath = path.resolve(commandsDir, fileName);

      if (!fs.existsSync(filePath))
        return api.sendMessage(`الملف ${fileName} غير موجود!`, event.threadID, event.messageID);

      try {
        await fs.remove(filePath);
        return api.sendMessage(`تم حذف الأمر: ${fileName} 🗑️`, event.threadID, event.messageID);
      } catch (err) {
        return api.sendMessage(`حصل خطأ أثناء الحذف: ${err.message}`, event.threadID, event.messageID);
      }
    }

    /* ===============================
       9) أي رسالة أخرى → AI عربي
    ================================ */
    const aiReply = await aiProcess(input);
    return api.sendMessage(aiReply, event.threadID, event.messageID);
  }
};
