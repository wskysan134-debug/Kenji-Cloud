const fs = require('fs');
const path = require('path');

const bankDBPath = path.join(__dirname, '..', '..', 'database', 'bank.json');

function readBankDB() {
    try {
        const data = fs.readFileSync(bankDBPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {};
        }
        console.error('خطأ عند قراءة قاعدة بيانات البنك:', error);
        return {};
    }
}

function writeBankDB(data) {
    try {
        fs.writeFileSync(bankDBPath, JSON.stringify(data, null, 4));
    } catch (error) {
        console.error('خطأ عند الكتابة في قاعدة بيانات البنك:', error);
    }
}

module.exports = {
    config: {
        name: 'البنك',
        version: '1.1',
        author: 'Hridoy',
        countDown: 5,
        prefix: true,
        groupAdminOnly: false,
        description: 'نظام بنك مع قروض وأعلى الأرصدة.',
        category: 'اقتصاد',
        guide: {
            en: '   {pn} إنشاء - لإنشاء حساب بنك' +
                '\n   {pn} - للتحقق من رصيدك' +
                '\n   {pn} قرض <المبلغ> - للحصول على قرض' +
                '\n   {pn} سداد - لسداد القرض' +
                '\n   {pn} الأعلى - لعرض أغنى 10 مستخدمين'
        },
    },
    onStart: async ({ api, event, args }) => {
        const { senderID } = event;
        const bankDB = readBankDB();
        const subcommand = args[0];

        if (!subcommand) {
            if (bankDB[senderID]) {
                const userData = bankDB[senderID];
                const statusMessage = `حالة حسابك البنكي:\n` +
                                      `الرصيد: ${userData.bankBalance}\n` +
                                      `لديك قرض: ${userData.loan ? 'نعم' : 'لا'}\n` +
                                      `مبلغ القرض: ${userData.loanAmount}`;
                return api.sendMessage(statusMessage, event.threadID);
            } else {
                return api.sendMessage("ليس لديك حساب بنك. استخدم `البنك إنشاء` لإنشاء حساب.", event.threadID);
            }
        }

        if (subcommand === 'إنشاء') {
            if (bankDB[senderID]) {
                return api.sendMessage("لديك بالفعل حساب بنك.", event.threadID);
            }
            bankDB[senderID] = {
                userID: senderID,
                loan: false,
                loanAmount: 0,
                bankBalance: 0
            };
            writeBankDB(bankDB);
            return api.sendMessage("تم إنشاء حسابك البنكي بنجاح!", event.threadID);
        }

        if (!bankDB[senderID]) {
            return api.sendMessage("ليس لديك حساب بنك. استخدم `البنك إنشاء` أولاً.", event.threadID);
        }

        if (subcommand === 'قرض') {
            const amount = parseInt(args[1]);

            if (isNaN(amount) || amount <= 0) {
                return api.sendMessage('الرجاء إدخال مبلغ صالح للقرض.', event.threadID);
            }

            if (amount > 10000) {
                return api.sendMessage('يمكنك الحصول على قرض حتى 10,000 فقط.', event.threadID);
            }

            if (bankDB[senderID].loan) {
                return api.sendMessage('لديك قرض قائم بالفعل.', event.threadID);
            }

            bankDB[senderID].loan = true;
            bankDB[senderID].loanAmount = amount;
            bankDB[senderID].bankBalance += amount;

            writeBankDB(bankDB);

            return api.sendMessage(`تم الحصول على قرض بمبلغ ${amount}. رصيدك الحالي: ${bankDB[senderID].bankBalance}.`, event.threadID);

        } else if (subcommand === 'سداد') {
            if (!bankDB[senderID].loan) {
                return api.sendMessage('ليس لديك قرض قائم.', event.threadID);
            }

            const loanAmount = bankDB[senderID].loanAmount;

            if (bankDB[senderID].bankBalance < loanAmount) {
                return api.sendMessage(`ليس لديك ما يكفي لسداد القرض. تحتاج على الأقل ${loanAmount}.`, event.threadID);
            }

            bankDB[senderID].bankBalance -= loanAmount;
            bankDB[senderID].loan = false;
            bankDB[senderID].loanAmount = 0;

            writeBankDB(bankDB);

            return api.sendMessage(`تم سداد قرضك بنجاح. رصيدك الحالي: ${bankDB[senderID].bankBalance}.`, event.threadID);

        } else if (subcommand === 'الأعلى') {
            const sortedUsers = Object.values(bankDB).sort((a, b) => b.bankBalance - a.bankBalance);
            const topUsers = sortedUsers.slice(0, 10);

            let message = 'أعلى 10 مستخدمين من حيث الرصيد:\n';
            for (let i = 0; i < topUsers.length; i++) {
                const user = topUsers[i];
                try {
                    const userInfo = await api.getUserInfo(user.userID);
                    const name = userInfo[user.userID].name;
                    message += `${i + 1}. ${name}: ${user.bankBalance}\n`;
                } catch (e) {
                    message += `${i + 1}. المستخدم ${user.userID}: ${user.bankBalance}\n`;
                }
            }

            return api.sendMessage(message, event.threadID);

        } else {
            return api.sendMessage('أمر غير صالح. استخدم `البنك إنشاء`، `البنك قرض`، `البنك سداد`، أو `البنك الأعلى`.', event.threadID);
        }
    },
};
