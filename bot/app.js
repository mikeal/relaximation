var couchapp = require('couchapp'),
    path = require('path');

var ddoc = {_id:'_design/app', 'views':{}, 'updates':{}, 'shows':{}}

ddoc.rewrites = [
  {from:'/', to:'index.html'},
  {from:'/run/:type', to:'_show/:type'},
  ]

ddoc.shows.perf = function (doc, req) {
  
} 

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'))

exports.app = ddoc