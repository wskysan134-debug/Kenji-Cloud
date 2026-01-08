const axios = require('axios');

module.exports = {
    config: {
        name: 'الذكاء_الاصطناعي',
        version: '1.0',
        author: 'Hridoy',
        countDown: 5,
        prefix: true,
        groupAdminOnly: false,
        description: 'التحدث مع نموذج GPT-4 الذكي.',
        category: 'ai',
        guide: {
            ar: '   {pn}الذكاء_الاصطناعي <سؤال>',
            en: '   {pn}gpt4 <query>'
        },
    },
    onStart: async ({ api, event, args }) => {
        const threadID = event.threadID;
        const messageID = event.messageID;

        const query = args.join(' ').trim();
        if (!query) {
            return api.sendMessage('❌ الرجاء كتابة سؤال. مثال: !الذكاء_الاصطناعي ما هي عاصمة فرنسا؟', threadID, messageID);
        }

        try {
            console.log(`Requesting GPT-4 with query: ${query}`);
            const response = await axios.get(
                `https://hridoy-apis.onrender.com/ai/gpt4?ask=${encodeURIComponent(query)}`,
                { timeout: 15000 }
            );

            console.log('GPT-4 response:', response.data);

            if (response.data.status && response.data.result) {
                // إذا كان الرد طويلًا يمكن تقسيمه أو إرساله كما هو
                await api.sendMessage(response.data.result, threadID, messageID);
            } else {
                api.sendMessage('⚠️ استجابة غير صالحة من واجهة GPT-4.', threadID, messageID);
            }
        } catch (error) {
            console.error('GPT-4 error:', error.message);
            api.sendMessage(`❌ حدث خطأ أثناء الاتصال بواجهة GPT-4: ${error.message}`, threadID, messageID);
        }
    },
};
