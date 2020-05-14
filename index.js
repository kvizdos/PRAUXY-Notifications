const _Server = require("./server")
const _Client = require("./client");

const createServer = (port = 8084) => new _Server.createServer(port);
const connect = (appID, secret, url = "http://localhost:8084", cb) => new _Client.client(url, appID, secret, cb);

module.exports.createServer = createServer;
module.exports.connect = connect;