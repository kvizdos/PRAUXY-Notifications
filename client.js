class PRAUXYNotificationClient {
    constructor(url = "https://notifications.prauxy.app", appID = undefined) {
        if(appID == undefined) throw new Error("appID required.");
        this.appID = appID;
        this.socket = require('socket.io-client')(url);
    
        this.socket.emit("connect to", appID, (status) => {
            console.log(status)
            if(status.status != "complete") {
                throw new Error(status.reason);
            }

            this.isReady = true;
        });
    }

    send(userInfo, title, body) {
        this.socket.emit('send-notification', {
            appID: this.appID,
            user: userInfo,
            title: title,
            body: body,
        });
    }

    
}

module.exports.client = PRAUXYNotificationClient;