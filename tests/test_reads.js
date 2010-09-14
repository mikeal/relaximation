var pool = require('../common/testpool')
  , request = require('../common/request')
  , sys = require('sys')
  , fs = require('fs')
  , path = require('path')
  ;
  
var h = {'content-type':'application/json', 'accept':'applications/json'}
  
exports.testReads = function (options, cb) {
  if (options.url[options.url.length - 1] !== '/') options.url += '/';
  
  var doTest = function () {
    var count = 0
      , runstart = new Date()
      , readPool
      ;
    var opts = {uri: options.url + options.docids[0], headers: h, count: options.clients, method:"GET"};
    readPool = pool.createPool(opts, function (e, o, resp, body) {
      if (e) throw e;
      if (resp.statusCode !== 200) throw new Error("Did not create document. "+body);
      opts.uri = (options.url + options.docids[Math.floor(Math.random()*options.docids.length)]);
    });
    readPool.uri = options.url;

    var clockStart = new Date()
    var interval = setInterval(function () {
      var t = (new Date() - runstart)      
        , p = readPool.poll()
        ;

      r = { timeline: t, clients: p.times.length, 
            totalRequests: p.totalRequests, timesCount: 0, average: 0
            }
      r.clients += p.times.length;
      r.totalRequests += p.totalRequests;

      for (var y=0;y<p.times.length;y+=1) {
        r.average += p.times[y];
        r.timesCount += 1;
      }

      r.average = (r.average / r.timesCount);
      p.starttimes.sort();
      r.oldest = p.starttimes[0];
      r.last = p.starttimes[p.starttimes.length - 1];
      cb(r)

    }, 1000)

    setTimeout(function () {
      clearInterval(interval);
      readPool.end(function (p) {});
      cb(null);
    }, 1000 * options.duration);
  }
  
  if (!options.docids) {
    options.docids = [];
    request({uri:options.url+'_all_docs', headers:h}, function (err, resp, body) {
      JSON.parse(body).rows.forEach(function (row) {
        options.docids.push(row.id);
      })
      doTest();
    })
  } else {doTest();}
  
  
  
}

if (require.main === module) {
  var cmdopts = require('../common/cmdopts')
    , opts = cmdopts.createOptions({
    clients :    { short: "c", "default": 50,                
                   help: "Number of concurrent clients per database."
                 }
    , url :      { short: "u", 
                   help: "CouchDB url to run tests against."
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
  
  if (options.url[options.url.length - 1] === '/') curi = options.url.slice(0,options.url.lastIndexOf('/', options.url.length - 2))
  else curi = options.url.slice(0, options.url.lastIndexOf('/'))

  request({uri:curi, headers:h}, function (err, resp, body) {
    options.dbinfo = JSON.parse(body);
  })
  request({uri:curi+'/_config', headers:h}, function (err, resp, body) {
    options.dbconfig = JSON.parse(body);
  })
  
  exports.testReads(options, function (obj) {
    if (obj) {
      options.results.push({reads:obj})
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

