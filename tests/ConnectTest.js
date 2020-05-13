const _NOTIFICATIONS = require('../index').connect("wru50ig4l4gsah4s5mxa94-b");

setTimeout(() => {
    _NOTIFICATIONS.send({}, "This is a test title", "This is a test body");

}, 500)