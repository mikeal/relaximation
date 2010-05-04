var testModule = require('./test_write_and_read')

var sys = require("sys"),
    fs = require("fs"),
    http2 = require("../common/httplib2"),
    path = require("path"),
    client = require("../common/client"),
    optionparser = require("../common/optionparser"),
    events = require('events');

var opts = new optionparser.OptionParser();
opts.addOption('-w', '--wclients', "number", "write_clients", 50, 
               "Number of concurrent write clients per process. Default is 50.");
opts.addOption('-r', '--rclients', "number", "read_clients", 200, 
               "Number of concurrent read clients per process. Default is 200.");
opts.addOption('-u', '--url1', "string", "url1", "http://localhost:5984", 
               "CouchDB url to run tests against. Default is http://localhost:5984");
opts.addOption('-v', '--url2', "string", "url2", "http://localhost:5985", 
                "CouchDB url to run tests against. Default is http://localhost:5985");
opts.addOption('-1', '--name1', "string", "name1", null, "Name of first comparative. Required.");
opts.addOption('-2', '--name2', "string", "name2", null, "Name of first comparative. Required.");
opts.addOption('-d', '--doc', "string", "doc", "small", "small or large doc. Default is small.");
opts.addOption('-t', '--duration', "number", "duration", 60, "Duration of the run in seconds. Default is 60.")
opts.addOption('-i', '--poll', "number", "poll", 1, "Polling interval in seconds. Default is 1.")
opts.addOption('-p', '--graph', "string", "graph", "http://mikeal.couchone.com/graphs", 
               "CouchDB to persist results in. Default is http://mikeal.couchone.com/graphs")
opts.addOption('-r', '--recurrence', "number", "recurrence", 10, "How many times to run the tests. Deafult is 10.")

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

function runTest (options, callback) {
  var results1 = []
  var results2 = []

  var i = 1;
  
  function run () {
    testModule.test(options.url1, options.write_clients, options.read_clients, options.doc, options.duration, options.poll, function (error, results) {
      var r = {results:results, time:new Date(), clients:options.clients, 
               doctype:options.doc, duration:options.duration}
      results1.push(r)
      testModule.test(options.url2, options.write_clients, options.read_clients, options.doc, options.duration, options.poll, function(error, results) {
        r = {results:results, time:new Date(), clients:options.clients, 
             doctype:options.doc, duration:options.duration}
        results2.push(r)

        if (i !== options.recurrence) {
          i += 1;
          run();
        } else {
          body = {'results':[{name:options.name1, results:results1}, {name:options.name2, results:results2}], 
                  time:new Date(), rclients:options.read_clients, doctype:options.doc, duration:options.duration,
                  recurrence:options.recurrence, wclients:options.write_clients}
          if (callback) {
            callback(body);
          }
          client.request(options.graph, 'POST', JSON.stringify(body), undefined, undefined, 'utf8',  
            function (error, response, body) {
              if (error) {throw new Error(error)}
              if (response.statusCode != 201) {
                sys.puts('Failed to store results in ' + options.graph);
                throw new Error(error + ' Status ' + response.statusCode + '\n' + body);
              }
              else {sys.puts(options.graph+'/'+'_design/app/_show/compareWriteReadTest/'+JSON.parse(body)['id'])}
              process.exit();
          })
        }
      })
    })
  }
  run();
}

opts.ifScript(__filename, function(options) {
  if (!options.name1 || !options.name2) {
    throw "YOU MUST GIVE ME NAMES, --name1 and --name2"
  }
  runTest(options)
})


