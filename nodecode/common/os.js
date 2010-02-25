var sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    events = require('events'),
    uuid = require('./uuid');

var subprocessCall = function(cmd, args, env, cwd, printBuffer) {
  var buffer = '';
  if (cwd) { var olddir = process.cwd(); process.chdir(cwd);}
  var child = process.createChildProcess(cmd, args, env);
  if (cwd) { process.chdir(olddir);}
  child.addListener("output", function (data) {
    if (data) { 
      if (printBuffer) { sys.print(data);}
      buffer += data; 
    }
  });
  child.addListener("error", function(data) {
    if (data) {
      buffer += data;
      sys.print(data);
    }
  });
  var p = new events.Promise();
  child.addListener("exit", function(code) {p.code = code;p.emitSuccess();});
  p.wait();
  return [p.code, buffer];
};

var mkdir = function (dir, mode) {
  if (!mode) {
    mode = 0755;
  }
  p = new events.Promise();
  fs.mkdir(dir, mode)
    .addCallback(function(){p.emitSuccess()})
    .addErrback(function(){throw 'failed to create '+dir});
  p.wait();
}

var exists = function (f) {
  var p = new events.Promise();
  path.exists(f, function(exists_) {
    if (exists_) {
      p.result = true;
    } else {
      p.result = false;
    }
    p.emitSuccess();
  })
  p.wait();
  return p.result;
}

var isdir = function (dir) {
  if (!exists(dir)) {
    return false;
  }
  var r = {};
  fs.stat(dir)
    .addCallback(function(stat){r.result = stat.isDirectory();})
    .wait();
  return r
}

var open = function (file, mode, perm) {
  p = new events.Promise();
  if (typeof(mode) == "string") {
    mode = {w:process.O_WRONLY, r:process.O_RDONLY, c:process.O_CREAT}[mode];
  }
  if (!perm) { perm = 0755 }
  fs.open(file, mode, perm)
    .addCallback(function (fd){p.fd = fd; p.emitSuccess(fd)});
  p.wait();
  return p.fd;
}

var write = function (file, data) {
  if (typeof(file) == "string") {
    fd = open(file, 'w');
  }
  fs.write(fd, data).wait();
}

var read = function (filename) {
  var p = new events.Promise();
  fs.cat(filename).addCallback(function(content) {p.content = content; p.emitSuccess()})
  p.wait();
  return p.content;
}

exports.open = open;
exports.write = write;
exports.read = read;
exports.isdir = isdir
exports.mkdir = mkdir;
exports.subprocessCall = subprocessCall;