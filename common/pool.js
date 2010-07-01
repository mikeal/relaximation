var net = require('net'),
    sys = require('sys'),
    Buffer = require('buffer').Buffer,
    url = require('url');

var CRLF = "\r\n";

function headerConversion (headers) {
  var keys = Object.keys(headers);
  var isArray = (headers instanceof Array);
  var messageHeader = ''
  var field, value;
  for (var i = 0, l = keys.length; i < l; i++) {
    var key = keys[i];
    if (isArray) {
      field = headers[key][0];
      value = headers[key][1];
    } else {
      field = key;
      value = headers[key];
    }

    messageHeader += field + ": " + value + CRLF;
  }
  return messageHeader;
}

function parseHeaders (headbuffer) {
  // status = parseInt(headbuffer.slice(0, headbuffer.indexOf(CRLF)).split(' ')[1]);
  headbuffer = headbuffer.slice(headbuffer.indexOf(CRLF));
  var lines = headbuffer.split(CRLF);
  var headers = {};
  for (var i=0;i<lines.length;i+=1) {
    var v = lines[i].split(' : ');
    headers[v[0]] = v[1];
  }
  return headers;
}
    
function parseStatus (headbuffer) {
  return parseInt(headbuffer.slice(0, headbuffer.indexOf(CRLF)).split(' ')[1]);
}    
    
function createPool (size, port, hostname, method, pathname, headers, body, statusCallback, bodyCallback) {
  var clients = [];
  var active = true;
  var stoppedCallback;
  var ended = 0;
    
  if (typeof headers === 'function') {headers = headers()}
  
  if (!headers.host) {
    headers.host = hostname + ':' + port
  }
  
  if (typeof body !== 'function' && (method === 'POST' | method === 'PUT')) {
    headers['content-length'] = body.length;
  }
  
  var messageHeader = headerConversion(headers)
  
  var createClient = function () {
    var client = net.createConnection(port, hostname);
    var headbuffer = null;
    var head = null;
    var bodybuffer = null;
    var contentLength;
    var chunkLength = 0;
    
    var request = function () {
      if (!active) {
        client.end();
        return false;
      }
      if (typeof method === 'function') {method = method()}
      if (typeof pathname === 'function') {pathname = pathname()} 
      if (!client._starttime) {
        client._starttime = new Date();
      }
      if (typeof body === 'function') {
        var nbody = body();
        headers['content-length'] = nbody.length;
        client.write(method + " " + pathname + " HTTP/1.1\r\n" + headerConversion(headers) + CRLF);
      } else {
        client.write(method + " " + pathname + " HTTP/1.1\r\n" + messageHeader + CRLF);
      }
      if (nbody) {
        client.write(nbody);
      } else if (body){
        client.write(body)
      }
      headbuffer = '';
      bodybuffer = '';
      head = '';
      chunkLength = 0;
      contentLength = 0;
      client.addListener('data', headHandler);
    }
    
    var headHandler = function (chunk) {
      chunk = chunk.toString();
      headbuffer += chunk
      if (headbuffer.indexOf('\r\n\r\n') !== -1) {
        var i = headbuffer.indexOf('\r\n\r\n');
        head = headbuffer.slice(0, i);
        var chunk = headbuffer.slice(i);
        head += '\r\n'
        var i = head.toLowerCase().indexOf("content-length");
        // Enable fixed length entity body parsing
        contentLength = parseInt(head.slice(head.indexOf(': ', i)+2, head.indexOf('\r\n', i)));
        client.removeListener("data", headHandler);
        headbuffer = null;
        bodybuffer = '';
        client.addListener("data", fixedLengthHandler);
        fixedLengthHandler(chunk.slice('\r\n\r\n'.length));
      }
    }

    var fixedLengthHandler = function (chunk) {
      chunkLength += chunk.length;    
      if (bodyCallback) {
        bodybuffer += chunk;
      }
      if (chunkLength >= contentLength) {
        client.starttime = client._starttime;
        client._starttime = null;
        client.endtime = new Date();
        client.removeListener("data", fixedLengthHandler);
        if (bodyCallback) {
          bodyCallback(bodybuffer);
        }
        if (statusCallback) {
          statusCallback(parseStatus(head));
        }
        request();
      }
    }
    client.addListener("connect", function () {
      request(client);
    })
    
    client.addListener("end", function () {
      if (active) {
        sys.puts('unexpected disconnect')
        client.connect(port, hostname)
      } else {
        ended += 1;
        if (ended === clients.length) {
          stoppedCallback();
        }
      }
    })
    return client;
  }
  
  var pool = {};
  pool.average = function () {
    var p = new Date();
    var starttimes = [];
    var endtimes = [];
    var meantimes = [];
    for (var i=0;i<clients.length;i+=1) {
      if (clients[i].endtime) {
        var c = clients[i];
        starttimes.push(c.starttime);
        endtimes.push(c.endtime);
        meantimes.push(c.endtime - c.starttime);
      }
    }
    return {meantimes:meantimes, starttimes:starttimes, endtimes:endtimes, pollts:p}
  }
  pool.stop = function (callback) {
    active = false;
    stoppedCallback = callback;
  }
  
  var ramp = function () {
    if (clients.length !== size && active) {
      clients.push(createClient());
      setTimeout(ramp, 100)
    }
  }
  
  setTimeout(ramp, 100)
  return pool
}

function createWritePool (size, uri, doc, statusCallback, bodyCallback) {
  if (typeof uri === 'string') {
    var u = url.parse(uri);
    uri = u.pathname;
  } else {
    var u = url.parse(uri());
  }
  var p = createPool(size, u.port, u.hostname, 'POST', uri, {'content-type':'application/json'}, doc, function (status) {
    if (statusCallback) {
      statusCallback(status);
    }
    if (status === 409) {sys.print('x')}
    else if (status !== 201) {throw new Error("Status is not 201")}
  }, bodyCallback);
  return p;
}

function createReadPool (size, uri, statusCallback, bodyCallback) {
  if (typeof uri === 'string') {
    var u = url.parse(uri);
    uri = u.pathname;
  } else {
    var u = url.parse(uri());
  }
  
  var p = createPool(size, u.port, u.hostname, 'GET', uri, {'content-type':'application/json'}, null, function (status) {
    if (statusCallback) {
      statusCallback(status);
    }
    if (status !== 200) {throw new Error("Status is not 200. Got "+status)}
  }, bodyCallback);
  return p;
}

exports.createPool = createPool;
exports.createWritePool = createWritePool;
exports.createReadPool = createReadPool;

if (require.main == module) {
  var pool = createPool(1000, 5984, 'localhost', 'GET', '/newvisitors', {'accept-type':'application/json'}, null, null, function (body) {    
  })
  setInterval(function () {
    sys.puts(JSON.stringify(pool.average()));
  }, 1000)
}



