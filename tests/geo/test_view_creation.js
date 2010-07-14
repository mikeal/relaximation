var fs = require('fs')
  , path = require('path')
  , sys = require('sys')
  , request = require('request');

var bulk = '{"docs":[' + fs.readFileSync(path.join(__dirname, 'gnis_names09_bulk.json')).toString() + ']}';

ddoc = {_id:'_design/test', views:{}}
ddoc.views.test = {map: function (doc) {emit(doc._id, 1)}.toString()}

function provision (callback) {
  var starttime = new Date();
  request({uri:'http://localhost:5984/geotest', method:'PUT', headers:{'content-type':'application/json'}}, function (error, resp) {
    if (error) throw error;
    request({uri:'http://localhost:5984/geotest/_bulk_docs', method:'POST', body:bulk, headers:{'content-type':'application/json'}}, function(error, resp) {
      if (error) throw error
      sys.debug('Created DB in time '+(((new Date()) - starttime) / 1000)+'s');
      callback();
    })
  })
}

function test () {
  var starttime = new Date();
  request({uri:'http://localhost:5984/geotest/_design/test', method:'PUT', body:JSON.stringify(ddoc)}, 
    function (error, resp, body) {
    request({uri:'http://localhost:5984/geotest/_design/test/_view/test?key="asdf"', method:'GET'}, function (error, resp, body) {
      // sys.debug(sys.inspect(resp))
      sys.debug('Response body :: '+body)
      sys.debug('View generation time '+(((new Date()) - starttime) / 1000)+'s');
    })
  })
}

provision(test);
