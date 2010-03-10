var http = require('http');
var url = require("url");
var sys = require("sys");
var events = require("events");

var request = function (u, method, headers, body, callback) {
  var p = {}
  var u = url.parse(u);
  var h = http.createClient(parseInt(u.port), u.hostname);
  h.addListener('error', function(error){callback(true)})
  if (!headers) {
    headers = {};
  }
  headers['host'] = u.hostname+':'+u.port;
  if (u.search) {
    pathname = u.pathname + u.search
  } else {pathname = u.pathname}
  var r = h.request(method, pathname, headers);
  if (body) { r.write(body, "utf8"); }
  
  p.buffer = '';
  r.addListener("response", function (response) {
    p.status = response.statusCode;
    p.headers = response.headers;
    p.httpVersion = response.httpVersion;
    response.addListener("data", function (data) {
      p.buffer += data;
    })
    response.addListener("end", function (){
      callback(undefined, p.status, p.headers, p.buffer, p.httpVersion)
    });
  })
  r.close()
}

exports.request = request;