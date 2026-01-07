const fs = require('fs-extra');
const express = require('express');
const login = require('fca-priyansh');
const { loadCommands, handleCommand } = require('./handler/command');
const handleEvent = require('./handler/event');
const { handleMessage } = require('./handler/message');
const { log } = require('./logger/logger');
const config = require('./config/config.json');

const app = express();
app.use(express.static('public'));

app.get('/config', (req, res) => {
    res.json(config);
});

app.get('/command-count', (req, res) => {
    res.json({ count: global.client.commands.size });
});

const chalk = require('chalk');
const axios = require('axios');
const gradient = chalk.bold.green;

// تأكد من وجود ملفات قاعدة البيانات
['users.json','cooldowns.json','bank.json'].forEach(file=>{
    const filePath = path.join(__dirname,'..','..','database',file);
    if(!fs.existsSync(filePath)) fs.writeFileSync(filePath,'{}');
});

const displayBanner = async () => {
    try {
        const res = await axios.get('https://raw.githubusercontent.com/1dev-hridoy/1dev-hridoy/refs/heads/main/kenji.txt');
        const banner = Buffer.from(res.data, 'base64').toString('utf8');
        console.log(gradient(banner));
    } catch (err) {
        console.error('Failed to fetch or display banner:', err);
    }
};

const initializeBot = async () => {
    await displayBanner();
    console.log(chalk.bold.cyan('Loading commands...'));

    try {
        if (!fs.existsSync('./appstate.json')) {
            log('error', 'appstate.json not found. Please provide a valid appstate.json file.');
            process.exit(1);
        }

        const appState = fs.readJsonSync('./appstate.json');
        if (!Array.isArray(appState) || appState.length === 0) {
            log('error', 'appstate.json is invalid or empty.');
            process.exit(1);
        }

        let attempts = 0;
        const maxAttempts = 3;
        let api;
        while (attempts < maxAttempts) {
            try {
                api = await new Promise((resolve, reject) => {
                    login({ appState }, (err, api) => {
                        if (err) return reject(err);
                        resolve(api);
                    });
                });
                break;
            } catch (error) {
                attempts++;
                log('error', `Login attempt ${attempts} failed: ${error.message}`);
                if (attempts >= maxAttempts) {
                    log('error', 'Max login attempts reached. Please check appstate.json.');
                    process.exit(1);
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        api.setOptions({ listenEvents: true, selfListen: true, forceLogin: true });

        global.client = {
            handleReply: [],
            commands: new Map(),
            events: new Map(),
            config: config
        };

        if (global.client.config.ownerUID && !global.client.config.adminUIDs.includes(global.client.config.ownerUID)) {
            global.client.config.adminUIDs.push(global.client.config.ownerUID);
            fs.writeJsonSync('./config/config.json', global.client.config, { spaces: 2 });
            log('info', `Added ownerUID ${global.client.config.ownerUID} to adminUIDs.`);
        }

        const commands = loadCommands();
        commands.forEach((cmd, name) => global.client.commands.set(name, cmd));

        api.listenMqtt(async (err, event) => {
            if (err) {
                log('error', `Event listener error: ${err.message}`);
                return;
            }
            if (!event.threadID) return; // تأكد من وجود threadID

            if (event.type === 'event') {
                await handleEvent(event, api);
            } else if (event.type === 'message' || event.type === 'message_reply') {
                const time = new Date().toLocaleTimeString();
                const messageType = event.isGroup ? 'Group' : 'Private';
                let content = '';

                if (event.body) {
                    content = `Text: ${event.body}`;
                } else if (event.attachments && event.attachments.length > 0) {
                    content = `Media: ${event.attachments.map(att => att.url).join(', ')}`;
                }

                console.log(gradient(`[${time}] [${messageType}] ${content}`));

                await handleMessage(event, api, commands);
            }
        });

        const port = process.env.PORT || 20170;
        app.listen(port, () => {
            log('info', `Web server running on port ${port}`);
        });

        log('info', 'Bot initialized successfully');
        global.botStartTime = Date.now();

        // التعامل مع restart.json بأمان
        try {
            if (fs.existsSync('./restart.json')) {
                const restartInfo = fs.readJsonSync('./restart.json');
                if (restartInfo.threadID) {
                    api.sendMessage(`Bot has been restarted.`, restartInfo.threadID);
                }
                fs.removeSync('./restart.json');
            }
        } catch {}

        process.on('SIGINT', () => {
            log('info', 'Bot stopped by user (Ctrl+C)');
            process.exit(0);
        });

    } catch (error) {
        log('error', `Bot initialization error: ${error.message}`);
        process.exit(1);
    }
};

fs.removeSync('./PriyanshFca.json');
initializeBot();
