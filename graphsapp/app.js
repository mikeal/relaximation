var couchapp = require('../../node.couch.js/couchapp/lib/couchapp'),
    path = require('path');

ddoc = {_id:'app'}

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'))

exports.app = ddoc