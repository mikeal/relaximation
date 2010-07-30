var sys = require("sys"),
    fs = require("fs"), 
    http2 = require("../common/httplib2"),
    path = require("path"),
    client = require("../common/client"),
    pool = require("../common/pool"),
    optionparser = require("../common/optionparser"),
    request = require('../common/request/main')
    events = require('events');

var opts = new optionparser.OptionParser();
opts.addOption('-c', '--clients', "number", "clients", 100, "Number of concurrent read clients per process.");
opts.addOption('-u', '--url', "string", "url", null, "CouchDB url to run tests against.");
opts.addOption('-t', '--duration', "number", "duration", 60, "Duration of the run in seconds.");
opts.addOption('-i', '--poll', "number", "poll", 1, "Polling interval in seconds.");
opts.addOption('-p', '--graph', "string", "graph", "http://mikeal.couchone.com/graphs", "CouchDB to persist results in.");

var sum = function (values) {
  var rv = 0;
  for (var i in values) {
    rv += values[i];
  }
  return rv;
};

opts.ifScript(__filename, function(options) {
  var url = options.url
  if (options.url === null) throw 'You need to set url to your couchdb url'
  if (options.url[options.url.length -1] !== '/') options.url += '/'
  request({uri:options.url+'_all_docs', headers:{'content-type':'application/json'}}, function (err, resp, body) {
    if (err) throw err;
    if (resp.statusCode !== 200) throw 'All docs does not exist. \n'+body;
    var ids = [];
    JSON.parse(body).rows.forEach(function (row) {ids.push(row.id)});
    var starttime = new Date();    
    var randomUrl = function () {
      var i = Math.floor(Math.random() * (ids.length - 1))
      var id = ids[i]
      return options.url+id
    }
    var readPool;
    
    var results = [];
    
    setTimeout(function () {readPool = pool.createReadPool(options.clients, randomUrl);}, 500)
    
    var poller = setInterval(function(){
      var time = (new Date() - starttime) / 1000
      // var wmn = writePool.getMeantime();
      // var rmn = readPool.getMeantime();
      var r = readPool.average();
      
      r.meantimes.sort()
      r.starttimes.sort()
      r.endtimes.sort()
      
      var r = {time: time, reads:{clients:r.meantimes.length, 
                                    average:parseInt((sum(r.meantimes) / r.meantimes.length).toString().split('.')[0]),
                                    last:r.pollts - r.endtimes[r.endtimes.length - 1],
                                    }
               }
      results.push(r);
      sys.puts(JSON.stringify(r));
    }, options.poll * 1000);
    setTimeout(function(){
      // uri, method, body, headers, client, encoding, callback
      clearInterval(poller);
      readPool.stop(function () {
        // client.request(url, 'DELETE', undefined, undefined, undefined, undefined, function (error) {
        //   callback(error, results)
        // })
      })
    }, options.duration * 1000);
    
  })
})




