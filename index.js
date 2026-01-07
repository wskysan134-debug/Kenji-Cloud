const { spawn } = require('child_process');
const { log } = require('./logger/logger');

let botProcess;
let restartCount = 0;
const MAX_RESTARTS = 5; 
const RESTART_DELAY = 5000;

function startBot() {
  if (botProcess) {
    log('info', 'إيقاف عملية البوت الحالية...');
    botProcess.kill(); 
  }

  log('info', 'تشغيل البوت...');
  botProcess = spawn('node', ['main.js'], { stdio: 'inherit' });

  botProcess.on('close', (code) => {
    log('info', `انتهت عملية البوت برمز الخروج ${code}`);
    if (code === 2) { 
      log('info', 'يتم إعادة تشغيل البوت...');
      setTimeout(startBot, RESTART_DELAY);
    } else if (code !== 0 && restartCount < MAX_RESTARTS) { 
      restartCount++;
      log('warn', `إعادة تشغيل البوت بعد ${RESTART_DELAY / 1000} ثوانٍ... (محاولة ${restartCount}/${MAX_RESTARTS})`);
      setTimeout(startBot, RESTART_DELAY);
    } else if (restartCount >= MAX_RESTARTS) {
      log('error', `توقف البوت بعد ${MAX_RESTARTS} محاولات إعادة تشغيل. يرجى التحقق من الأخطاء.`);
    } else {
      log('info', 'انتهت عملية البوت بشكل طبيعي.');
    }
  });

  botProcess.on('error', (err) => {
    log('error', `فشل في تشغيل عملية البوت: ${err.message}`);
  });
}


startBot();

process.on('SIGINT', () => {
  log('info', 'تم اكتشاف Ctrl+C. جاري إيقاف البوت...');
  if (botProcess) {
    botProcess.kill();
  }
  process.exit(0);
});
