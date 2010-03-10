var http = require("http");
var sys = require("sys");
var fs = require("fs");
var url = require("url");
var base64 = require("base64");

var sum = function (values) {
  var rv = 0;
  for (var i in values) {
    rv += values[i];
  }
  return rv;
};

var request = function (uri, method, body, headers, client, encoding, callback) {
  if (typeof uri == "string") {
    uri = url.parse(uri);
  }
  if (!headers) {
    headers = {'content-type':'application/json', 'accept':'application/json'};
  }
  if (!headers.host) {
    headers.host = uri.hostname;
    if (uri.port) {
      headers.host += (':'+uri.port)
    }
  }
  if (!uri.port) {
    uri.port = 80;
  }
  if (!client) { 
    client = http.createClient(uri.port, uri.hostname);
  }
  if (uri.auth) {
    headers.authorization = "Basic " + base64.encode(uri.auth);
  }
  var pathname = uri.search ? (uri.pathname + uri.search) : uri.pathname
  var request = client.request(method, uri.pathname, headers)
  if (body) {
    request.write(body, encoding);
  }
  request.addListener("response", function (response) {
    var buffer = '';
    response.addListener("data", function (chunk) {
      buffer += chunk;
    })
    response.addListener("end", function () {
      callback(undefined, response, buffer);
    })
  })
  request.close()
}

var Pool = function (limit) {
  this.clients = [];
  this.limit = limit;
  this.running = false;
  this.closed = 0
}
Pool.prototype.doClient = function (address, port, pathname, method, body, expectedStatus, h, getUrl) {
  var p = this;
  if (h == undefined) {
    var h = http.createClient(port, address);
    this.clients.push(h);
  }
  if (!this.running) {
    return;
  } 
  h._starttime = new Date();
  var r = h.request(method, pathname, {"host":address+":"+port, "content-type":"application/json"});
  if (body) {
    r.write(body, "utf8");
  }
  r.addListener("response", function (response) {
    if (response.statusCode != expectedStatus) {
      throw "Expected "+expectedStatus+" got "+response.statusCode;
    }
    if (response.httpVersion != '1.1') {
      throw "Unexpected version.";
    }
    if (p.response_handler) {
      response.buffer = '';
      response.addListener("data", function(chunk){response.buffer += chunk});
    }
    response.addListener("end", function () {
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
  r.close()
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
Pool.prototype.getTimeInfo = function () {
  var p = new Date();
  var starttimes = [];
  var endtimes = [];
  var meantimes = [];
  for (var i=0;i<this.clients.length;i+=1) {
    if (this.clients[i].endtime) {
      var c = this.clients[i];
      starttimes.push(c.starttime);
      endtimes.push(c.endtime);
      meantimes.push(c.endtime - c.starttime);
    }
  }
  return {meantimes:meantimes, starttimes:starttimes, endtimes:endtimes, pollts:p}
}

Pool.prototype.start = function (urlString, method, body, expected_status, i) {
  this.running = true;
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
Pool.prototype.stop = function (callback) {
  this.running = false;
  this.clients.forEach(function(c) {c.close(); c.forceClose()});
  if (callback) { callback() }
}

exports.Pool = Pool;
exports.request = request;


