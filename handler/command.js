const fs = require('fs-extra');
const path = require('path');
const { hasPermission } = require('../func/permissions');
const { checkCooldown } = require('../func/cooldown');
const { log } = require('../logger/logger');
const config = require('../config/config.json');

const loadCommands = () => {
  const commands = new Map();
  const commandPath = path.join(__dirname, '../modules/commands');
  const files = fs.readdirSync(commandPath).filter(file => file.endsWith('.js'));

  // تحميل مرادفات عربية إن وُجدت
  let arabicMap = {};
  const commandsArPath = path.join(__dirname, '..', 'locales', 'commands_ar.json');
  if (fs.existsSync(commandsArPath)) {
    try {
      arabicMap = fs.readJsonSync(commandsArPath);
    } catch (err) {
      log('warn', `تعذر قراءة ملفات المرادفات العربية: ${err.message}`);
    }
  }

  for (const file of files) {
    try {
      const command = require(path.join(commandPath, file));
      // احفظ الأمر بالاسم الداخلي
      commands.set(command.config.name, command);
      // سجل مرادفات إن وجدت في config.aliases
      if (!command.config.aliases) command.config.aliases = [];
      // أضف مرادفات عربية من ملف الخارطة
      for (const [arName, internal] of Object.entries(arabicMap)) {
        if (internal === command.config.name) {
          // أضف كـ alias داخل الكوماند
          if (!command.config.aliases.includes(arName)) {
            command.config.aliases.push(arName);
          }
          // وسجله كمفتاح في الخريطة للوصول السريع عبر الاسم العربي
          commands.set(arName, command);
        }
      }
      log('info', `تم تحميل الأمر: ${command.config.name}`);
    } catch (error) {
      log('error', `خطأ عند تحميل الأمر ${file}: ${error.message}`);
    }
  }
  return commands;
};

const handleCommand = async ({ message, args, event, api, Users, Threads, commands }) => {
  try {
    if (!args || args.length === 0) return; // منع خطأ لو args فاضي
    const commandName = args[0].toLowerCase();
    // ابحث عن الأمر في الخريطة (يدعم الآن مفاتيح عربية لأنها مُسجَّلة في الخريطة)
    let command = commands.get(commandName);
    // لو لم يعثر، حاول البحث عبر aliases
    if (!command) {
      command = Array.from(commands.values()).find(cmd => cmd.config.aliases?.map(a => a.toLowerCase()).includes(commandName));
    }
    if (!command) return;

    const userData = Users.get(event.senderID);
    if (userData && userData.isBanned) {
      return;
    }

    // تحقق من وضع admin-only
    if (global.client.config.adminOnlyMode && !hasPermission(event.senderID, { adminOnly: true })) {
      return api.sendMessage('البوت في وضع المسؤولين فقط. فقط مسؤولي البوت يمكنهم استخدام الأوامر.', event.threadID);
    }

    // تحقق من صلاحيات المستخدم للأمر
    if (!hasPermission(event.senderID, command.config, await api.getThreadInfo(event.threadID))) {
      return api.sendMessage('ليس لديك صلاحية لاستخدام هذا الأمر.', event.threadID);
    }

    // تحقق من الكولداون
    if (global.client.config.features?.cooldown && command.config.countDown) {
      if (!checkCooldown(event.senderID, command.config.name, command.config.countDown)) {
        return api.sendMessage(`الرجاء الانتظار ${command.config.countDown} ثانية قبل استخدام هذا الأمر مرة أخرى.`, event.threadID);
      }
    }

    await command.onStart({ message, args: args.slice(1), event, api, Users, Threads, config: global.client.config });
    log('info', `تم تنفيذ الأمر: ${command.config.name} بواسطة المستخدم ${event.senderID}`);
  } catch (error) {
    log('error', `خطأ في الأمر: ${error.message}`);
    api.sendMessage('حدث خطأ أثناء تنفيذ الأمر.', event.threadID);
  }
};

module.exports = { loadCommands, handleCommand };
