var pool = require('../common/testpool')
  , request = require('../common/request')
  , sys = require('sys')
  , fs = require('fs')
  , path = require('path')
  ;
  
var h = {'content-type':'application/json', 'accept':'applications/json'}
  
exports.testWrites = function (options, cb) {
  var count = 0
    , body = fs.readFileSync(path.join(__dirname, '..', 'common', options.doc+'_doc.json'))
    , runstart = new Date()
    , writePool
    , dbname = options.dbname ? options.dbname : 'testwritesdb'
    ;
  options.body = body;
  if (options.url[options.url.length - 1] !== '/') options.url += '/';
  var uri = (options.url + dbname)
  
  request({uri: uri, method: "PUT", headers: h}, function (error, resp, body) {
    if (error) throw error;
    if (resp.statusCode !== 201) {
      sys.print('Could not create database. '+body);
    }
    writePool = pool.createPool({uri: uri+'/', method: 'POST', body:options.body, 
                                headers: h, count:options.clients}, function (e, o, resp, body) {
      if (options.requestCallback) options.requestCallback(e, o, resp, body);
      if (e) throw e;
      if (resp.statusCode !== 201) throw new Error("Did not create document. "+body);
    });
    writePool.uri = uri;
  })
  
  var clockStart = new Date()
    , results = []
    ;
    
  var interval = setInterval(function () {
    var t = (new Date() - runstart)      
      , p = writePool.poll()
      ;
      
    r = { timeline: t, clients: p.times.length, 
          totalRequests: p.totalRequests, timesCount: 0, average: 0
          }
    r.clients = p.times.length;
    r.totalRequests += p.totalRequests;
    
    for (var y=0;y<p.times.length;y+=1) {
      r.average += p.times[y];
      r.timesCount += 1;
    }
    
    r.average = (r.average / r.timesCount);
    // if (!r.average && p.times.length === 50) console.log(sys.inspect(p)) 
    p.starttimes.sort();
    r.oldest = p.starttimes[0];
    r.last = p.starttimes[p.starttimes.length - 1];
    cb(r)
    
  }, 1000)
  
  setTimeout(function () {
    clearInterval(interval);
    writePool.end(function (p) {
      request({uri:p.uri, method:'DELETE'}, function (err, resp, body) {
        if (err) throw err;
        if (resp.statusCode !== 200) sys.print("Could not delete database. "+body)
      })
    });
    cb(null);
  }, 1000 * options.duration);
}

if (require.main === module) {
  var cmdopts = require('../common/cmdopts')
    , opts = cmdopts.createOptions({
    clients :    { short: "c", "default": 50,                
                   help: "Number of concurrent clients per database."
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
  
  exports.testWrites(options, function (obj) {
    if (obj) {
      options.results.push({writes:obj})
      sys.puts(sys.inspect(obj)); 
    }
    else {
      var body = JSON.stringify(options)
        , headers = {accept:'application/json', 'content-type':'application/json'}
        ;
      if (options.graph[options.graph.length -1] !== '/') options.graph += '/';
      
      request({uri:options.graph+'api', method:'POST', body:body, headers:headers}, function (err, resp, body) {
        var info = JSON.parse(body);
        sys.puts(options.graph+'#/graph/'+info.id);
        
      })
    }
  })

}