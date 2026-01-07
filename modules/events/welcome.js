const { log } = require('../../logger/logger');
const axios = require('axios');
const fs = require('fs-extra');

module.exports = {
  config: {
    name: 'welcome',
    version: '1.0',
    author: 'Hridoy',
    eventType: ['log:subscribe']
  },
  onStart: async ({ event, api }) => {
    try {
      const { threadID, logMessageData } = event;
      const thread = await api.getThreadInfo(threadID);

      // العضو الجديد
      const newUser = logMessageData.addedParticipants[0];
      const uid = newUser.userFbId;

      const userInfo = await api.getUserInfo(uid);
      const userName = userInfo[uid].name;

      // رابط صورة العضو (بدون توكن — أكثر أمانًا)
      const userImageUrl = `https://graph.facebook.com/${uid}/picture?width=512&height=512`;

      const memberCount = thread.participantIDs.length;

      const style = Math.floor(Math.random() * 5) + 1;

      // نصوص الترحيب بالعربي
      const mainText = 'مرحبًا';
      const secondText = `مرحبًا بك في مجموعة ${thread.threadName}، عدد الأعضاء ${memberCount}`;

      const apiUrl = `https://hridoy-apis.vercel.app/canvas/welcome-v4?avatarImgURL=${encodeURIComponent(userImageUrl)}&nickname=${encodeURIComponent(userName)}&mainText=${encodeURIComponent(mainText)}&secondText=${encodeURIComponent(secondText)}&style=${style}&apikey=hridoyXQC`;
      console.log(`[طلب API] الإرسال إلى: ${apiUrl}`);

      axios.interceptors.request.use(request => {
        console.log('[تفاصيل طلب API]', {
          url: request.url,
          method: request.method,
          headers: request.headers,
          params: request.params
        });
        return request;
      }, error => {
        console.log('[خطأ في طلب API]', error);
        return Promise.reject(error);
      });

      const apiResponse = await axios.get(apiUrl, { responseType: 'arraybuffer' });
      console.log(`[استجابة API] الحالة: ${apiResponse.status}, النص: ${apiResponse.statusText}`);

      const cacheDir = __dirname + '/cache';
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir);
      }

      const imagePath = `${cacheDir}/welcome_card.png`;
      fs.writeFileSync(imagePath, Buffer.from(apiResponse.data, 'binary'));

      await api.sendMessage({
        body: 'أهلًا وسهلًا بك في المجموعة! 👋',
        attachment: fs.createReadStream(imagePath)
      }, threadID, () => fs.unlinkSync(imagePath));

      log('info', `تم إرسال رسالة ترحيب في المجموعة ${threadID} للعضو ${userName}`);
    } catch (error) {
      console.log('[خطأ API]', error.message);
      log('error', `خطأ في حدث الترحيب: ${error.message}`);
    }
  },
};
