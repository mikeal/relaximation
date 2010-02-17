var http = require("http");
var sys = require("sys");
var posix = require("posix");
var url = require("url");

var sum = function (values) {
  var rv = 0;
  for (var i in values) {
    rv += values[i];
  }
  return rv;
};

var Pool = function (limit) {
  this.clients = [];
  this.limit = limit;
}
Pool.prototype.doClient = function (address, port, pathname, method, body, expectedStatus, h, getUrl) {
  var p = this;
  if (h == undefined) {
    var h = http.createClient(port, address);
    this.clients.push(h);
  } 
  h._starttime = new Date();
  var r = h.request(method, pathname, {"host":address+":"+port, "content-type":"application/json"});
  if (body) {
    r.sendBody(body, encoding="utf8");
  }
  r.finish(function (response) {
    if (response.statusCode != expectedStatus) {
      throw "Expected "+expectedStatus+" got "+response.statusCode;
    }
    if (response.httpVersion != '1.1') {
      throw "Unexpected version.";
    }
    if (p.response_handler) {
      response.buffer = '';
      response.addListener("body", function(chunk){response.buffer += chunk});
    }
    response.addListener("complete", function () {
      h.starttime = h._starttime;
      h.endtime = new Date();
      if (p.response_handler) {
        p.response_handler(JSON.parse(response.buffer))
      }
      if (getUrl) {
        urlString = getUrl();
        var u = url.parse(urlString);
        pathname = u.pathname;
        if (u.search) { pathname += u.search; }
        address = u.hostname; port = parseInt(u.port);
      }
      p.doClient(address, port, pathname, method, body, expectedStatus, h, getUrl);
    })
    response.addListener("close", function() {sys.puts('bad things!')})
  }) 
}
Pool.prototype.getMeantime = function () {
  var active = []
  for (i in this.clients) {
    if (this.clients[i].endtime) {
      active.push(this.clients[i].endtime - this.clients[i].starttime)
    }
  }
  return [active.length, (sum(active) / active.length) / 1000];
}
Pool.prototype.start = function (urlString, method, body, expected_status, i) {
  if (i == undefined) {  i = 0 }
  i++;
  var p = this;
  if (i < this.limit) {
    setTimeout(function () {p.start(urlString, method, body, expected_status, i)}, 100);
  }
  if (typeof(urlString) != "string") {
    var getUrl = urlString;
    urlString = urlString();
  }
  var u = url.parse(urlString);
  var pathname = u.pathname;
  if (u.search) {
    pathname += u.search;
  }
  this.doClient(u.hostname, parseInt(u.port), u.pathname, method, body, expected_status, undefined, getUrl);
}
Pool.prototype.startWriters = function (urlString, doc) {
  this.start(urlString, 'POST', doc, 201, 0);
}

exports.Pool = Pool;


