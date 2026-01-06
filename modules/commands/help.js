const fs = require('fs');
const path = require('path');
const axios = require('axios');

const configPath = path.join(__dirname, '..', '..', 'config', 'config.json');
const commandsPath = path.join(__dirname, '..', 'commands');

// رابط الصورة
const HELP_IMAGE = "https://i.ibb.co/PJK2n1N/Messenger-creation-2-DBBF1-E2-3696-464-A-BA72-D62-B034-DA8-F1.jpg";

function readDB(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading file at ${filePath}:`, error);
        return {};
    }
}

module.exports = {
    config: {
        name: 'اوامر',
        version: '2.0',
        author: 'Hridoy',
        countDown: 5,
        prefix: true,
        groupAdminOnly: false,
        description: 'يعرض قائمة الأوامر أو معلومات عن أمر معيّن',
        category: 'مساعدة',
        guide: {
            en: '   {pn}\n   {pn} <اسم_الأمر>'
        },
    },

    onStart: async ({ api, event, args }) => {
        const config = readDB(configPath);
        const commandName = args[0];

        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const commands = {};

        for (const file of commandFiles) {
            try {
                const command = require(path.join(commandsPath, file));
                if (command.config) {
                    commands[command.config.name.toLowerCase()] = command.config;
                    if (command.config.aliases) {
                        for (const alias of command.config.aliases) {
                            commands[alias.toLowerCase()] = command.config;
                        }
                    }
                }
            } catch (error) {
                console.error(`Error loading command from file ${file}:`, error);
            }
        }

        // ================== قائمة الأوامر ==================
        if (!commandName) {
            const ownerName = config.ownerName || 'غير معروف';
            const botName = config.botName || 'البوت';

            const categories = {};
            for (const cmd in commands) {
                const c = commands[cmd];
                if (!categories[c.category]) categories[c.category] = new Map();
                if (!categories[c.category].has(c.name)) categories[c.category].set(c.name, c);
            }

            let totalCommands = 0;
            for (const cat of Object.values(categories)) totalCommands += cat.size;

            let helpMessage = '';
            helpMessage += `╔═══════ ★ ${botName.toUpperCase()} ★ ═══════╗\n\n`;
            helpMessage += `👑 المطوّر : ${ownerName}\n`;
            helpMessage += `⚙️ عدد الأوامر : ${totalCommands}\n\n`;

            for (const [category, cmdsMap] of Object.entries(categories)) {
                const cmds = Array.from(cmdsMap.values());
                helpMessage += `━━━━━━━━━━━ ✦ ${category.toUpperCase()} ✦ ━━━━━━━━━━━\n`;

                let line = '';
                cmds.forEach((command, idx) => {
                    line += `• ${command.name}   `;
                    if ((idx + 1) % 4 === 0) line += '\n';
                });

                helpMessage += line + '\n\n';
            }

            helpMessage += `╚══════════════════════════════════╝\n`;
            helpMessage += `💡 اكتب: ${config.prefix}اوامر <اسم الأمر> لعرض التفاصيل`;

            // ===== إرسال الصورة مع الرسالة =====
            try {
                const imgStream = await axios.get(HELP_IMAGE, { responseType: 'stream' });

                return api.sendMessage(
                    {
                        body: helpMessage,
                        attachment: imgStream.data
                    },
                    event.threadID
                );
            } catch (err) {
                console.error("خطأ في تحميل الصورة:", err);
                return api.sendMessage(helpMessage, event.threadID);
            }

        // ================== تفاصيل أمر ==================
        } else {
            const commandConfig = commands[commandName.toLowerCase()];

            if (commandConfig) {
                let detailMessage = '';
                detailMessage += `╔═══════ ★ معلومات الأمر ★ ═══════╗\n\n`;
                detailMessage += `📌 الاسم : ${commandConfig.name}\n\n`;
                detailMessage += `📝 الوصف : ${commandConfig.description}\n\n`;
                detailMessage += `👨‍💻 المطوّر : ${commandConfig.author}\n\n`;
                detailMessage += `🔖 الإصدار : ${commandConfig.version}\n\n`;

                if (commandConfig.aliases && commandConfig.aliases.length > 0) {
                    detailMessage += `🔁 الأسماء البديلة : ${commandConfig.aliases.join(', ')}\n\n`;
                }

                if (commandConfig.guide && commandConfig.guide.en) {
                    detailMessage += `📖 طريقة الاستخدام :\n`;
                    detailMessage += commandConfig.guide.en.replace(
                        /{pn}/g,
                        config.prefix + commandConfig.name
                    ) + '\n\n';
                }

                detailMessage += `╚══════════════════════════════════╝`;

                return api.sendMessage(detailMessage, event.threadID);
            } else {
                return api.sendMessage(`❌ الأمر "${commandName}" غير موجود.`, event.threadID);
            }
        }
    },
};
