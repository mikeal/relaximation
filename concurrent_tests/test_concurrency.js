var sys = require("sys");
var tcp = require("tcp");
var posix = require("posix");
var client = require("./client");
var optionparser = require("./optionparser");
var opts = new optionparser.OptionParser();
opts.addOption('-n', '--clients', "number", "clients", 100, "Number of concurrent clients per process.");
opts.addOption('-p', '--processes', "number", "processes", 1, "Number of processes to run.");

options = opts.parse();

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

posix.cat("large_doc.json").addCallback(function (doc) {
  if (options.processes == 1) {
    client.start(doc, 0, options.clients);
    setInterval(function(){sys.puts(client.getMeantime())}, 1000)
  } else {
    while (c < options.processes) {
      port++;
      sys.exec("/usr/local/bin/node client_process.js --port "+port);
      ports.push(port);
      c++;
    }
    setTimeout(function () {
      var i = 0;
      while (i < options.processes) {
        var c = tcp.createConnection(ports[i], host="127.0.0.1");
        c.addListener("connect", function () {
          setTimeout(function(){c.send(JSON.stringify(['start', doc, options.clients]));}, 10)
        })
        connections.push(c);
        i++;
      }
      setInterval(function() {
        var returns = [];
        for (i in connections) {
          var c = connections[i];
          var retWrite = function (data) {
            returns.push(data);
            c.removeListener(retWrite);
            if (returns.length == options.processes) {
              var openc = [];
              var times = [];
              for (i in returns) {
                openc.push(returns[i][0]);
                times.push(returns[i][1]);
              }
              sys.puts(sum(openc)+' '+sum(times));
            }
          }
          c.addListener("receive", retWrite);
          sys.puts(c.readyState);
          c.send("getMeantime");
        }
      }, 5 * 1000);
    
    }, 500)
  }
})


