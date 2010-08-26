var pool = require('../common/testpool')
  , request = require('request')
  , sys = require('sys')
  , fs = require('fs')
  , path = require('path')
  ;
  
var h = {'content-type':'application/json', 'accept':'applications/json'}
  
exports.testWritesToMany = function (options, cb) {
  var count = 0
    , pools = []
    , body = fs.readFileSync(path.join(__dirname, '..', 'common', options.doc+'_doc.json'))
    ;
  options.body = body;
  if (options.url[options.url.length - 1] !== '/') options.url += '/'
  for (var i=0;i<options.dbs;i+=1) {
    var u = (options.url + 'testwritesdb' + i);
    request({uri: u, method: "PUT", headers: h}, function (error, resp, body) {
      if (error) throw error;
      if (resp.statusCode !== 201) {
        sys.debug('Could not create database. '+body);
      }
      pools.push(pool.createPool({uri: u+'/', method: 'POST', body:options.body, 
                                  headers: h, count:options.clients}, function (e, o, resp, body) {
        if (e) throw e;
        if (resp.statusCode !== 201) throw new Error("Did not create document. "+body);
      }));
    })
  }
  var clockStart = new Date();
  var interval = setInterval(function () {
    var r = {clients: 0, totalRequests: 0, average: 0}
      , starts = []
      , timesCount = 0
      ;
    for (var i=0;i<pools.length;i+=1) {
      var p = pools[i].poll();
      r.clients += p.times.length;
      r.totalRequests += p.totalRequests;
      for (var y=0;y<p.times.length;y+=1) {
        r.average += p.times[y];
        timesCount += 1;
      }
    }
    r.average = (r.average / timesCount);
    starts.sort();
    r.oldest = starts[0];
    r.last = starts[starts.length - 1]
    cb(r)
  }, 1000)
  
  setTimeout(function () {
    clearInterval(interval);
    for (var i=0;i<pools.length;i+=1) {
      pools[i].end();
    }
    cb(null);
  }, 1000 * options.duration);
}

if (require.main === module) {
  var cmdopts = require('../common/cmdopts')
    , opts = cmdopts.createOptions({
    clients :    { short: "c", "default": 50,                
                   help: "Number of concurrent clients per database."
                 }
    , dbs :      { short: "n", "default": 2, 
                   help: "Number of databases to write to."
                 }
    , url :      { short: "u", "default": "http://localhost:5984",
                   help: "CouchDB url to run tests against."
                 }
    , doc :      { short: "d", "default": "small",
                   help: "small or large doc."
                 }
    , duration : { short: "t", "default": 60,          
                   help: "Duration of the run in seconds."
                 }
    , graph :    { short: "g", "default": "http://mikeal.couchone.com/graphs", 
                   help: "CouchDB to persist results in."
                 }
  });

  exports.testWritesToMany(opts.run(), function (obj) {
    if (obj) {sys.puts(JSON.stringify(obj))}
    else {sys.debug('END')}
  })

}