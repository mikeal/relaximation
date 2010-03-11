var sys = require("sys");
var tcp = require("tcp");
var fs = require("fs");
var http2 = require("../common/httplib2");
var path = require("path")
var client = require("../common/client");
var optionparser = require("../common/optionparser");
var events = require('events');
var opts = new optionparser.OptionParser();
opts.addOption('-w', '--wclients', "number", "write_clients", 50, "Number of concurrent write clients per process.");
  opts.addOption('-r', '--rclients', "number", "read_clients", 200, "Number of concurrent read clients per process.");
opts.addOption('-u', '--url', "string", "url", "http://localhost:5984", "CouchDB url to run tests against.");
opts.addOption('-d', '--doc', "string", "doc", "small", "small or large doc.");
opts.addOption('-t', '--duration', "number", "duration", 60, "Duration of the run in seconds.")
opts.addOption('-i', '--poll', "number", "poll", 1, "Polling interval in seconds.")
opts.addOption('-g', '--graph', "string", "graph", "http://couchdb.couchdb.org/graphs", 
               "CouchDB graph server to persist results in.")

var port = 8000;
var ports = [];
var connections = [];
var c = 0;

var sum = function (values) {
  var rv = 0;
  for (var i in values) {
    rv += values[i];
  }
  return rv;
};

var randomnumber=Math.floor(Math.random()*11)

var test = function (url, write_clients, read_clients, doc, duration, poll, callback) {
  if (url[url.length - 1] != '/') {
    url += '/';
  }
  url += 'testwritesdb';
  var results = [];
  var p = {}
  http2.request(url, 'PUT', {'accept':'application/json'}, undefined, function (error, status) {
    fs.readFile(path.join('..', 'common', doc+"_doc.json"), function (error, doc) {
      if (error) {
        sys.puts('Cannot cat'+path.join('..', 'common', doc+"_doc.json"));
      } else {
        var starttime = new Date();
        var ids = [];            
        var writePool = new client.Pool(write_clients);
        writePool.response_handler = function (resp) {
          if (resp.id) {
            ids.push(resp.id);
          }
        };
        writePool.startWriters(url, doc)
        var readPool = new client.Pool(read_clients);
        setTimeout(function () {
          readPool.start( function () {
            var i = Math.floor(Math.random() * (ids.length - 1))
            var id = ids[i]
            return url+'/'+id
          }, 'GET', null, 200);
        },1000)
        
        
        var poller = setInterval(function(){
          var time = (new Date() - starttime) / 1000
          // var wmn = writePool.getMeantime();
          // var rmn = readPool.getMeantime();
          var w = writePool.getTimeInfo();
          var r = readPool.getTimeInfo();
          
          w.meantimes.sort()
          w.starttimes.sort()
          w.endtimes.sort()
          r.meantimes.sort()
          r.starttimes.sort()
          r.endtimes.sort()
          
          var r = {time: time, writes:{clients:w.meantimes.length, 
                                        average:parseInt((sum(w.meantimes) / w.meantimes.length).toString().split('.')[0]),
                                        last:w.pollts - (w.endtimes[w.endtimes.length - 1]),
                                        },
                               reads:{clients:r.meantimes.length, 
                                        average:parseInt((sum(r.meantimes) / r.meantimes.length).toString().split('.')[0]),
                                        last:r.pollts - r.endtimes[r.endtimes.length - 1],
                                        }
                   }
          results.push(r);
          sys.puts(JSON.stringify(r));
        }, poll * 1000);
        setTimeout(function(){
          // uri, method, body, headers, client, encoding, callback
          clearInterval(poller);
          readPool.stop(function () {
            writePool.stop(function () {
              client.request(url, 'DELETE', undefined, undefined, undefined, undefined, function (error) {
                callback(error, results)
              })
            })
          })
        }, duration * 1000);
      }
    })
  })
  return p;
}

exports.test = test;

opts.ifScript(__filename, function(options) {
  test(options.url, options.write_clients, options.read_clients, options.doc, options.duration, options.poll, function (error, results) {
    if (options.graph) {
      body = {results:results, time:new Date(), rclients:options.read_clients, 
              wclients:options.write_clients, doctype:options.doc, duration:options.duration}
      client.request(options.graph, 'POST', JSON.stringify(body), undefined, undefined, 'utf8',  
        function (error, response, body) {
          if (response.statusCode != 201) {sys.puts('bad!')}
          else {sys.puts(options.graph+'/'+'_design/app/_show/writeReadTest/'+JSON.parse(body)['id'])}
          process.exit();
        }
      )    
      } else {
      process.exit();
    }
  })
})


