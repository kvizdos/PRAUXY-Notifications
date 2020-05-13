const path = require('path');
const pkg = require(path.join(__dirname, 'package.json'))

// TY https://dev.to/aligoren/then-after-foreach-984
Object.defineProperty(Array.prototype, "asyncForEach", {
    enumerable: false,
    value: function(task){
        return new Promise((resolve, reject) => {
            this.forEach(function(item, index, array){
                task(item, index, array);
                if(Object.is(array.length - 1, index)){
                    resolve({ status: 'finished', count: array.length })
                }
            });        
        })
    }
});

class PRAUXYNotificationServer {
    constructor(port = 8084) {
        this.port = port;

        // Install body-parser and Express
        this.express = require('express')
        this.app = this.express();
        this.http = require('http').createServer(this.app);
        this.io = require('socket.io')(this.http);

        this.MongoClient = require('mongodb').MongoClient;
        this.MongoURL = "mongodb://localhost:27017/";
        
        this.bodyParser = require('body-parser')
        this.webpush = require('web-push');

        // Use req.query to read values!!
        this.app.use(this.bodyParser.json());
        this.app.use(this.bodyParser.urlencoded({ extended: true }));

        const _this = this;

        this.mongo = {
            connect(dbName) {
                return new Promise((resolve, reject) => {
                    _this.MongoClient.connect(_this.MongoURL, { useUnifiedTopology: true }, function(err, db) {
                        if (err) reject(err);
                        var dbo = db.db(dbName);

                        resolve(dbo, db);
                    });
                })
            },
            insert(collection, obj) {
                return new Promise((resolve, reject) => {
                    this.connect("homerouter").then((dbo, db) => {
                        dbo.collection(collection).insertOne(obj, (err, res) => {
                            if(err) reject(err);

                            resolve(res);
                        });
                    }).catch(err => reject(err));
                })
            },
            find(collection, query) {
                return new Promise((resolve, reject) => {
                    this.connect("homerouter").then((dbo, db) => {
                        dbo.collection(collection).find(query).toArray((err, res) => {
                            if(err) reject(err);

                            resolve(res);
                        });
                    }).catch(err => reject(err));
                })
            },
            addToList(collection, query, obj) {
                return new Promise((resolve, reject) => {
                    this.connect("homerouter").then((dbo, db) => {
                        dbo.collection(collection).updateMany(query, {$push: obj}, (err, res) => {
                            if(err) reject(err);

                            resolve(res);
                        });
                    }).catch(err => reject(err));
                })
            }
        }
    
        this.registerEndpoints();
        this.registerSocketEndpoints();

        this.http.listen(port, () => {
            console.log('Standalone PRAUXY Notification Server started on port ' + port);
        });
    }

    generateRandomID(length = 24) {
        const opts = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456890-".toLowerCase();
        let id = "";

        for(let i = 0; i < length; i++) {
            id += opts[Math.floor(Math.random() * opts.length)];
        }

        return id;
    }

    registerSocketEndpoints() {
        const _this = this;

        this.io.on('connection', (socket) => {
            socket.on('connect to', (appID, cb) => {
                _this.mongo.find("notifications", {id: appID}).then(r => {
                    if(r.length > 0) {
                        r = r[0];

                        socket.appID = appID;
                        socket.vapidDetails = ["mailto:"+r.email, r.vapidKeys.publicKey, r.vapidKeys.privateKey]

                        cb({status: "complete"});
                    } else {
                        cb({status: "fail", reason: "invalid app id"});
                    }
                });
            })
            socket.on('send-notification', (details) => {
                const payload = JSON.stringify({title: details.title, body: details.body});

                _this.webpush.setVapidDetails(...socket.vapidDetails);

                _this.mongo.find("notifications", {id: socket.appID}).then(r => {
                    if(r.length > 0) {
                        r = r[0];

                        for(let subscriber of r.subscribers) {
                            if(subscriber.userID == details.user.userID || details.user.userID == "*" || details.user.userID == undefined) {
                                _this.webpush.sendNotification(subscriber.subscription, payload).then(r => {
                                    totalSent++;
                                }).catch(err => {
                                    totalFailed++;
                                });
                            }
                        }
                    }

                });
            })

        })
    }

    registerEndpoints() {
        const _this = this;

        const path = require('path');

        this.app.get('/', (req, res) => { res.send(`Notifications running on PRAUXY Notifications V${pkg.version}`) })

        this.app.use('/napi', this.express.static(path.join(__dirname, 'frontend')))
        this.app.use('/prauxynotificationsw.js', this.express.static(path.join(__dirname, 'frontend/worker.js')))

        this.app.post("/:id/subscribe", (req, res) => {   
            const sub = req.body.subscription;

            if(sub == undefined) return res.status(400).json({reason: "invalid subscription"});

            const payload = JSON.stringify({title: "test"});

            _this.mongo.find("notifications", {id: req.params.id}).then(r => {
                if(r.length != 0) {
                    r = r[0];
                    this.webpush.setVapidDetails("mailto:"+r.email, r.vapidKeys.publicKey, r.vapidKeys.privateKey);

                    this.webpush.sendNotification(sub, payload).then(r => {
                        _this.addSubscriber(req.params.id, req.body.userid, {isMobile: true}, sub).then(r => {
                            res.status(200).json({status: "complete", resp: r})
                        }).catch(e => res.status(500).json({status: "fail", reason: "mongodb", extra: e}));
                    }).catch(err => {
                        console.log(err);
                        res.status(500).json({reason: "invalid sub"})
                    });
                } else {
                    res.status(404).json({fail: "unknown id"})
                }
            })
        })

    }

    createApplication(email, name, url) {
        const _this = this;

        return new Promise((resolve, reject) => {
            const newApp = {
                id: _this.generateRandomID(),
                name: name,
                url: url,
                subscribers: [],
                vapidKeys: _this.webpush.generateVAPIDKeys(),
                email: email
            }

            this.mongo.insert("notifications", newApp).then(r => resolve(newApp)).catch(r => reject(r));
        })
    }

    addSubscriber(appID, userID, deviceInfo, subscriptionInfo) {
        const _this = this;

        return new Promise((resolve, reject) => {
            _this.mongo.addToList("notifications", {id: appID}, {subscribers: { userID: userID, deviceInfo: deviceInfo, subscription: subscriptionInfo } }).then(r => {
                resolve(r);
            }).catch(r => reject(r));
        })
    }
}

module.exports.createServer = PRAUXYNotificationServer;