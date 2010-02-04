var http = require('http'),
    sys = require('sys'),
    path = require('path'),
    posix = require('posix'),
    events = require('events'),
    http2 = require('./common/httplib2'),
    mimetypes = require('./common/mimetypes');

var listdir = function (pathname) {
  var p = new events.Promise();
  var ls = process.createChildProcess("ls", [pathname]);
  ls.addListener("output", function (data) {
    if (data) { 
      var files = [];
      data.split('\n').forEach(function(f) {if (f){files.push(f)}});
      p.emitSuccess(files)
    }
  });
  return p;
}

var rev = null;

var walk = function (pathname, callback) {
  listdir(pathname).addCallback(function(files) {
    files.forEach(function(f) {
      var abspath = path.join(pathname, f)
      posix.stat(abspath).addCallback(function(stat) {
        if (stat.isDirectory()) {
          walk(abspath, callback);
        } else {
          callback(abspath);
        }
      }).wait();
    })
  }).wait();
}

var updateAttachment = function (pathname, uri, rev) {
  var p = new events.Promise();
  var uri = uri+'?rev='+rev
  posix.cat(pathname).addCallback(function(content) {
    var s = pathname.split('.');
    var headers = {'content-type':mimetypes.types[s[s.length - 1]]}
    http2.request(uri, 'PUT', headers, content).addCallback(function(status, headers, body) {
      if (status != 201) {
        p.emitError(status, headers, body, uri);
      } else {
        p.emitSuccess(status, headers, body, uri);
      }
    })
  })
  return p;
}

var updateAttachments = function (rev) {
  var files = [];
  walk('design', function(f){files.push(f)});
  var p = new events.Promise();
  var dofile = function (rev) {
    var f = files.pop()
    var name = f.replace('design/', '', 1);
    var uri = 'http://localhost:5984/results/_design/app/'+name
    updateAttachment(f, uri, rev)
      .addCallback(function (status, headers, body) {
        process.watchFile(f, undefined, function() {}) 
        
        if (files.length > 0) {
          dofile(JSON.parse(body)['rev']);
        } else {
          p.emitSuccess()
        }
      });
    }
  dofile(rev);
  return p;
}


var sync = function (dev) {
  http2.request('http://localhost:5984/results/_design/app', 'GET')
    .addCallback(function(status, headers, body) {
      if (status != 200) {
        var headers = {'content-type':'application/json'}
        http2.request('http://localhost:5984/results/', 'POST', headers, {'_id':'_design/app'})
          .addCallback(function(status, headers, body) {
            updateAttachments(JSON.parse(body)['_rev']);
          })
      } else {
        var doc = JSON.parse(body);
        updateAttachments(doc['_rev']);
      }
    })
}

var dev = (process.ARGV[process.ARGV.length - 1] == 'dev')

sync(dev)