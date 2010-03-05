var couchapp = require('../../node.couch.js/couchapp/lib/couchapp'),
    app = require('./app');

couchapp.sync(app.app, 'http://localhost:5984/graphs');