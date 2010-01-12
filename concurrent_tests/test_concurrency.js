var sys = require("sys");
var tcp = require("tcp");
var posix = require("posix");
var client = require("./client");
var optionparser = require("./optionparser");
var opts = new optionparser.OptionParser();
opts.addOption('-c', '--clients', "number", "clients", 100, "Number of concurrent clients per process.");
opts.addOption('-u', '--url', "string", "url", "http://localhost:5984", "URL to run tests against.")

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
  client.start(options.url, doc, 0, options.clients);
  setInterval(function(){sys.puts(client.getMeantime())}, 1000)
})


