var http = require("http");
var sys = require("sys");
var posix = require("posix");

var clients = [];

var x = 0;

var sum = function (values) {
  var rv = 0;
  for (var i in values) {
    rv += values[i];
  }
  return rv;
};

var startClient = function (address, port, path, method, body, expectedStatus, h) {
  if (h == undefined) {
    var h = http.createClient(port, address);
    clients.push(h);
  }
  h._starttime = new Date();
  var r = h.request(method, path, {"host":address, "content-type":"application/json"});
  r.sendBody(body, encoding="utf8");
  r.finish(function (response) {
    if (response.statusCode != expectedStatus) {
      throw "Expected "+expectedStatus+" got "+response.statusCode;
    }
    if (response.httpVersion != '1.1') {
      throw "Unexpected version.";
    }
    response.addListener("complete", function () {
      h.starttime = h._starttime;
      h.endtime = new Date();
      startClient(address, port, path, method, body, expectedStatus, h);
    })
  })
}

var start = function (doc, i, limit) {
  // if (outputInterval) {
  //   setInterval(function () {
  //     var active = []
  //     for (i in clients) {
  //       if (clients[i].endtime) {
  //         active.push(clients[i].endtime - clients[i].starttime)
  //       }
  //     }
  //     sys.puts( active.length+" "+(sum(active) / active.length) / 1000)
  //   }, outputInterval * 1000)
  // }
  i++;
  if (i < limit) {
    setTimeout(function () {start(doc, i, limit)}, 100)
  }
  startClient("localhost", 5984, '/testdb/', 'POST', doc, 201);
};

var getMeantime = function () {
  var active = []
  for (i in clients) {
    if (clients[i].endtime) {
      active.push(clients[i].endtime - clients[i].starttime)
    }
  }
  return [active.length, (sum(active) / active.length) / 1000];
}

exports.start = start;
exports.getMeantime = getMeantime;



