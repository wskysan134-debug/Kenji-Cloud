const { log } = require('../../logger/logger');
const axios = require('axios');
const fs = require('fs-extra');

module.exports = {
  config: {
    name: 'welcome ',
    version: '1.0',
    author: 'Hridoy',
    eventType: ['log:subscribe']
  },
  onStart: async ({ event, api }) => {
    try {
      const { threadID, logMessageData } = event;
      const thread = await api.getThreadInfo(threadID);
      const newUser = logMessageData.addedParticipants[0];
      const uid = newUser.userFbId;
      const userInfo = await api.getUserInfo(uid);
      const userName = userInfo[uid].name;
      const userImageUrl = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`;
      const memberCount = thread.participantIDs.length;

      const style = Math.floor(Math.random() * 5) + 1;
      const apiUrl = `https://hridoy-apis.vercel.app/canvas/welcome-v4?avatarImgURL=${encodeURIComponent(userImageUrl)}&nickname=${encodeURIComponent(userName)}&mainText=${encodeURIComponent('Welcome')}&secondText=${encodeURIComponent(`Welcome to ${thread.threadName} with ${memberCount} members`)}&style=${style}&apikey=hridoyXQC`;
      console.log(`[API Request] Sending to: ${apiUrl}`);

      axios.interceptors.request.use(request => {
        console.log('[API Request Details]', {
          url: request.url,
          method: request.method,
          headers: request.headers,
          params: request.params
        });
        return request;
      }, error => {
        console.log('[API Request Error]', error);
        return Promise.reject(error);
      });

      const apiResponse = await axios.get(apiUrl, { responseType: 'arraybuffer' });
      console.log(`[API Response] Status: ${apiResponse.status}, Status Text: ${apiResponse.statusText}`);

      const cacheDir = __dirname + 'cache';
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir);
      }
      const imagePath = `${cacheDir}/welcome_card.png`;
      fs.writeFileSync(imagePath, Buffer.from(apiResponse.data, 'binary'));

      await api.sendMessage({
        body: 'Welcome to the group!',
        attachment: fs.createReadStream(imagePath)
      }, threadID, () => fs.unlinkSync(imagePath));

      log('info', `Welcome message sent to ${threadID} for ${userName}`);
    } catch (error) {
      console.log('[API Error]', error.message);
      log('error', `Welcome event error: ${error.message}`);
    }
  },
};
