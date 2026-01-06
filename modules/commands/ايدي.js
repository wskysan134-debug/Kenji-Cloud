module.exports = {
    config: {
        name: 'ايدي',
        version: '1.0',
        author: 'Hridoy',
        countDown: 5,
        prefix: true,
        groupAdminOnly: false,
        description: 'Get the user ID of yourself, a mentioned user, or a replied-to user.',
        category: 'utility',
        guide: {
            en: '   {pn}' +
                '\n   {pn} [@mention]' +
                '\n   Reply to a message with {pn}'
        },
    },
    onStart: async ({ api, event }) => {
        const { senderID, mentions, messageReply } = event;
        let targetID;

        if (messageReply) {
            targetID = messageReply.senderID;
        } else if (mentions && Object.keys(mentions).length > 0) {
            targetID = Object.keys(mentions)[0];
        } else {
            targetID = senderID;
        }

        api.sendMessage(`The UID is: ${targetID}`, event.threadID);
    },
};
