const express = require('express')
const app = express();

const _NS = new (require('./index'))(app, 9091);

app.get("/", (req, res) => res.sendFile('index.html', {root: "./frontend"}));

app.listen(9091, () => console.log('Non-standalone started.'));

// const newApp = _NS.createApplication("notifications@prauxy.app", "Test App").then(r => {
//     return r;
// }).catch(e => console.log(e));

// _NS.addSubscriber("Test App", {isMobile: true}, "blahblah")

console.log("Running")