var sys = require("sys");
var tcp = require("tcp");
var posix = require("posix");
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
opts.addOption('-p', '--couchdb', "string", "couchdb", "", "CouchDB to persist results in.")

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

var test = function (url, write_clients, read_clients, doc, duration, poll) {
  if (url[url.length - 1] != '/') {
    url += '/';
  }
  url += 'testwritesdb';
  var results = [];
  var p = new events.Promise();
  http2.request(url, 'PUT', {'accept':'application/json'})
    .addCallback(function(status) {
      posix.cat(path.join('..', 'common', doc+"_doc.json"))
        .addCallback(function (doc) {
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
            
            
            setInterval(function(){
              var time = (new Date() - starttime) / 1000
              var wmn = writePool.getMeantime();
              var rmn = readPool.getMeantime();
              var r = {time: time, writers:{clients:wmn[0], averagetime:wmn[1]},
                                   readers:{clients:rmn[0], averagetime:rmn[1]}};
              results.push(r);
              sys.puts(JSON.stringify(r));
            }, poll * 1000);
            setTimeout(function(){
              http2.request(url, 'DELETE', {'accept':'application/json'}).addCallback(
                function(){p.emitSuccess(results)})
            }, duration * 1000);
          })
        .addErrback(function(){sys.puts('Cannot cat'+path.join('..', 'common', doc+"_doc.json"))});
    }
  )
  return p;
}

opts.ifScript(__filename, function(options) {
  test(options.url, options.write_clients, options.read_clients, options.doc, options.duration, options.poll)
    .addCallback(function(results) {
      if (options.couchdb) {
        body = {'results':results, time:new Date(), clients:options.clients, doctype:options.doc, duration:options.duration}
        http2.request(options.couchdb, 'POST', {'content-type':'application/json'}, JSON.stringify(body)).addCallback(function(status){if (status != 201){sys.puts('bad!')};process.exit()})
      } else {
        process.exit();
      }
    })
})


