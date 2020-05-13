const _Server = require("./server")
const _Client = require("./client");

const createServer = (port = 8084) => new _Server.createServer(port);

const connect = (appID, url = "http://localhost:8084") => {
    const client = new _Client.client(url, appID);

    return client;
}

module.exports.createServer = createServer;
module.exports.connect = connect;