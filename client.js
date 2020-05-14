class PRAUXYNotificationClient {
    constructor(url = "https://notifications.prauxy.app", appID = undefined, secret = undefined, cb = () => {}) {
        if(appID == undefined) throw new Error("appID required.");
        this.appID = appID;
        this.socket = require('socket.io-client')(url);
    
        console.log("Secret " + secret)

        this.socket.emit("connect to", appID, secret, (status) => {
            if(status.status != "complete") {
                cb({ status: "failed", message: "invalid secret" })
                return;
            }

            this.isReady = true;
            cb({status: "connected"});
        });
    }

    send(userInfo, message, cb = () => {}) {
        this.socket.emit('send-notification', {
            appID: this.appID,
            user: userInfo,
            title: message.title,
            body: message.body,
        }, cb);
    }

    
}

module.exports.client = PRAUXYNotificationClient;