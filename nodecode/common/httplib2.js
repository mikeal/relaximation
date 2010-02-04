var http = require('http');
var url = require("url");
var sys = require("sys");
var events = require("events");

var request = function (u, method, headers, body) {
  var p = new events.Promise();
  var u = url.parse(u);
  var h = http.createClient(parseInt(u.port), u.hostname);
  h.addListener('error', function(){p.emitError()})
  if (!headers) {
    headers = {};
  }
  headers['host'] = u.hostname+':'+u.port;
  if (u.search) {
    pathname = u.pathname + u.search
  } else {pathname = u.pathname}
  var r = h.request(method, pathname, headers);
  
  if (body) { r.sendBody(body, encoding="utf8"); }
  
  p.buffer = '';
  r.finish(function (response) {
    p.status = response.statusCode;
    p.headers = response.headers;
    p.httpVersion = response.httpVersion;
    response.addListener("body", function (data) {
      p.buffer += data;
    })
    response.addListener("complete", function (){
      p.emitSuccess(p.status, p.headers, p.buffer, p.httpVersion);
    });
  })
  return p;
}

exports.request = request;