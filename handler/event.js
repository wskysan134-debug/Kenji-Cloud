const fs = require('fs');
const path = require('path');
const { log } = require('../logger/logger');

const events = new Map();
const eventPath = path.join(__dirname, '../modules/events');
const files = fs.readdirSync(eventPath).filter(file => file.endsWith('.js'));

// تحميل كل ملفات الأحداث
for (const file of files) {
    try {
        const eventModule = require(path.join(eventPath, file));
        if (eventModule.config && eventModule.config.name && eventModule.config.eventType) {
            events.set(eventModule.config.name, eventModule);
            log('info', `تم تحميل الحدث: ${eventModule.config.name}`);
        } else {
            log('error', `فشل في تحميل الحدث من ${file}: التكوين مفقود أو غير صالح.`);
        }
    } catch (error) {
        log('error', `خطأ عند تحميل الحدث ${file}: ${error.message}`);
    }
}

module.exports = async (event, api) => {
    try {
        if (!event || !api) return;

        for (const [eventName, eventModule] of events) {
            const eventTypes = eventModule.config.eventType || [];

            let shouldTrigger = false;

            const logType = event.logMessageType || '';
            const type = event.type || '';

            // التحقق من الأحداث بدقة أكبر
            if (
                (type === 'event' && (eventTypes.includes(logType) || logType.startsWith('log:'))) ||
                ((type === 'message' || type === 'message_reply') && 
                 (eventTypes.includes('message') || eventTypes.includes('message_reply')))
            ) {
                shouldTrigger = true;
            }

            if (shouldTrigger && typeof eventModule.onStart === 'function') {
                try {
                    await eventModule.onStart({ event, api });
                } catch (err) {
                    log('error', `خطأ أثناء تنفيذ الحدث ${eventName}: ${err.message}`);
                }
            }
        }
    } catch (error) {
        log('error', `حدث خطأ غير متوقع في معالج الأحداث: ${error.message}`);
    }
};
