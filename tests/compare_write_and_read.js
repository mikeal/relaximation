var pool = require('../common/testpool')
  , request = require('../common/request')
  , sys = require('sys')
  , fs = require('fs')
  , path = require('path')
  , testReadsAndWrites = require('./test_write_and_read').testReadsAndWrites
  ;

var copy = function (obj) {
  var r = {};
  for (i in obj) r[i] = obj[i];
  return r;
}  

var h = {'content-type':'application/json', 'accept':'applications/json'}
  
exports.compareReadAndWrites = function (options, cb) {
  if (!options.name1 || !options.name2) throw new Error("You must provide names for the test nodes.")
  
  var name = options.name1
    , firstFinish = false
    , opts = copy(options)
    ;
  
  var listener = function (r) {
    if (!r) {
      if (firstFinish) cb(null);
      else {
        firstFinish = true;
        opts = copy(options)
        opts.url = options.url2;
        name = options.name2; 
        setTimeout(function () {
          testReadsAndWrites(opts, listener);
        }, 2000)
        
      }
    } else {
      if (r.writes) r[name+'-writes'] = r.writes; delete r.writes;
      if (r.reads) r[name+'-reads'] = r.reads; delete r.reads;
      cb(r);
    }
  }
  opts.url = options.url1
  testReadsAndWrites(opts, listener)
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
    , name1 :    { short: "1", 
                   help: "Name for first test node."
                 }
    , name2 :    { short: "2", 
                   help: "Name for second test node."
                 }
    , url1 :      { short: "u", "default": "http://localhost:5984",
                   help: "First CouchDB url to run tests against."
                 }
    , url2 :     { short: "i", "default": "http://localhost:5985",
                   help: "Second CouchDB url to run tests against."
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
  if (options.url1[options.url1.length - 1] !== '/') options.url1 += '/'
  if (options.url2[options.url2.length - 1] !== '/') options.url2 += '/'
  options.info1 = {}
  options.info2 = {}
  
  require('../common/couchinfo').getinfo(options.url1, options.info1);
  require('../common/couchinfo').getinfo(options.url2, options.info2);
  
  exports.compareReadAndWrites(options, function (obj) {
    if (obj) {
      options.results.push(obj)
      sys.puts(sys.inspect(obj)); 
    } else {
      delete options.url;
      var body = JSON.stringify(options);

      if (options.graph[options.graph.length -1] !== '/') options.graph += '/';

      request({uri:options.graph+'api', method:'POST', body:body, headers:h}, function (err, resp, body) {
        var info = JSON.parse(body);
        sys.puts(options.graph+'#/graph/'+info.id);
      })
    }
  })

}