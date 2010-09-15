var pool = require('../common/testpool')
  , request = require('../common/request')
  , sys = require('sys')
  , fs = require('fs')
  , path = require('path')
  ;
  
var h = {'content-type':'application/json', 'accept':'applications/json'}

var copy = function (obj) {
  var r = {};
  for (i in obj) r[i] = obj[i];
  return r;
}
  
exports.testReadsAndWrites = function (options, cb) {
  var wopts = copy(options)
    , ropts = copy(options)
    , readersStarted = false
    , readerDelay
    ;
  
  if (wopts.url[wopts.url.length - 1] === '/') wopts.url += '/'
  wopts.clients = options.wclients;
  ropts.clients = options.rclients;
  wopts.dbname = 'testreadandwrite';
  ropts.url = wopts.url + wopts.dbname;
  ropts.docids = [];
  
  wopts.requestCallback = function (e, o, resp, body) {
    ropts.docids.push(JSON.parse(body).id)
    if (!readersStarted) {
      readersStarted = true;
      // Only run the readers until the writers are scheduled to finish
      readerDelay = (new Date() - writeStart) 
      ropts.duration = ropts.duration - ((new Date() - writeStart) / 1000)
      require('./test_reads').testReads(ropts, function (r) {
        r.timeline += readerDelay;
        cb(r ? {reads:r} : null);
      })      
    }
  }
  
  var writeStart = new Date();
  require('./test_writes').testWrites(wopts, function (r) {
    cb(r ? {writes:r} : null)
  })
  
}

if (require.main === module) {
  var cmdopts = require('../common/cmdopts')
    , opts = cmdopts.createOptions({
      wclients : { short: "w", "default": 50,                
                   help: "Number of concurrent write clients."
                 }
    , rclients : { short: "r", "default": 200,                
                  help: "Number of concurrent read clients."
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
    , graph :    { short: "g", "default": "http://graphs.mikeal.couchone.com", 
                   help: "CouchDB to persist results in."
                 }
  });
  
  var options = opts.run();
  options.results = [];
  options.type = 'test'
  delete options.body
  if (options.url[options.url.length - 1] !== '/') options.url += '/'
  
  require('../common/couchinfo').getinfo(options.url, options);
  
  var nulls = 0;
  exports.testReadsAndWrites(options, function (obj) {
    if (obj) {
      options.results.push(obj)
      sys.puts(sys.inspect(obj)); 
    }
    else {
      nulls += 1
      if (nulls == 2) {
        sys.puts()
        var body = JSON.stringify(options);
        if (options.graph[options.graph.length -1] !== '/') options.graph += '/';

        request({uri:options.graph+'api', method:'POST', body:body, headers:h}, function (err, resp, body) {
          var info = JSON.parse(body);
          sys.puts(options.graph+'#/graph/'+info.id);

        })
      }
    }
  })

}