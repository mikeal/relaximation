var sys = require("sys");
var tcp = require("tcp");
var fs = require("fs");
var http2 = require("../common/httplib2");
var path = require("path")
var client = require("../common/client");
var optionparser = require("../common/optionparser");
var events = require('events');
var opts = new optionparser.OptionParser();
opts.addOption('-c', '--clients', "number", "clients", 100, "Number of concurrent clients per process.");
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

var testWrites = function (url, clients, doc, duration, poll, callback) {
  if (url[url.length - 1] != '/') {
    url += '/';
  }
  url += 'testwritesdb';
  var results = [];
  http2.request(url, 'PUT', {'accept':'application/json'}, undefined, function (status) {
    fs.readFile(path.join('..', 'common', doc+"_doc.json"), function (error, doc) {
      if (error) {
        sys.puts('Cannot cat'+path.join('..', 'common', doc+"_doc.json"));
        process.exit(1);
      }
      var starttime = new Date();
      var pool = new client.Pool(clients);
      pool.startWriters(url, doc)
      setInterval(function(){
        var time = (new Date() - starttime) / 1000
        var mn = pool.getMeantime();
        var r = {time:time, clients:mn[0], averagetime:mn[1]};
        results.push(r);
        sys.puts(JSON.stringify(r));
      }, poll * 1000);
      setTimeout(function(){
        http2.request(url, 'DELETE', {'accept':'application/json'}).addCallback(
          function(){callback(undefined, results)})
      }, duration * 1000);
    })
  })
}

opts.ifScript(__filename, function(options) {
  testWrites(options.url, options.clients, options.doc, options.duration, options.poll, function (error, results) {
    if (options.couchdb) {
      body = {'results':results, time:new Date(), clients:options.clients, doctype:options.doc, duration:options.duration}
      http2.request(options.couchdb, 'POST', {'content-type':'application/json'}, JSON.stringify(body)).addCallback(function(status){if (status != 201){sys.puts('bad!')};process.exit()})
    } else {
      process.exit();
    }
  })
})


