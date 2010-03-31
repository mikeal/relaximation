var http = require('http');
var url = require("url");
var sys = require("sys");
var events = require("events");
var base64 = require('./base64');

var guessEncoding = function (contentEncoding, contentType) {
  var encoding = "utf8";
  if (contentEncoding === undefined && contentType === undefined) {
    return "binary"
  }
  if (contentEncoding == 'gzip') {
    encoding = "binary";
  } else if (contentType) {
    if (contentType.indexOf('charset=') !== -1) {
      encoding = contentType.split('charset=')[1];
      if (encoding.toLowerCase() === 'utf-8') { return 'utf8'; }
      if (encoding.toLowerCase() === 'ascii') { return 'ascii'; }
      return "binary"
    } else if (contentType.slice(0,6) == 'video/' || contentType.slice(0,6) == 'audio/') {
      encoding = "binary";
    } else if (binaryContentTypes.indexOf(contentType) != -1) {
      encoding = "binary";
    }
  }
  return encoding;
}

var request = function (uri, method, headers, body, callback) {
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
  if (body) {
    headers['content-length'] = body.length;
  }
  if (!uri.port) {
    uri.port = 80;
  }
  client = http.createClient(uri.port, uri.hostname);
  var encoding = guessEncoding(headers['content-encoding'], headers['content-type'])
  
  var clientErrorHandler = function (error) {callback(error ? error : "clientError")}
  
  client.addListener('error', clientErrorHandler);
  if (uri.auth) {
    headers.authorization = "Basic " + base64.encode(uri.auth);
  }
  var pathname = uri.search ? (uri.pathname + uri.search) : uri.pathname
  var request = client.request(method, uri.pathname, headers)
  
  request.addListener('error', function (error) {callback(error ? error : "requestError")})
    
  if (body) {
    request.write(body, encoding);
  }
  
  request.addListener("response", function (response) {
    var buffer = '';
    response.addListener("data", function (chunk) {
      buffer += chunk;
    })
    response.addListener("end", function () {
      client.removeListener("error", clientErrorHandler);
      callback(undefined, response, buffer);
    })
  })
  request.close()
}

exports.request = request;