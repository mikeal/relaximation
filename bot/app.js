var couchapp = require('couchapp');

var ddoc = {_id:'_design/app', 'views':{}, 'updates':{}, 'shows':{}}

ddoc.rewrites = [
  {from:'/', to:'index.html'},
  {from:'/run/:type', '_show/:type'},
  ]

ddoc.shows.perf = function (doc, req) {
  
} 