var sys = require('sys'),
    path = require('path'),
    fs = require('fs'),
    assert = require('assert'),
    events = require('events'),
    uuid = require('./common/uuid');

function queue (actions, callback) {
  if (actions.length === 0) {
    callback();
    return;
  }
  var a = actions.shift();
  if (typeof a === "function") {
    var func = a;
    var args = [];
  } else if (typeof a === "object") {
    var func = a.shift();
    var args = a;
  } else {
    sys.puts("Invalid type in queue "+typeof(a))
  }
  args.push(function (error) {
    if (error) {callback(error)}
    else {queue(actions, callback)}
  })
  func.apply(func, args);
}

function parallel (actions, callback) {
  var count = 0;
  var expected = actions.length;
  actions.forEach(function (a) {
    a(function(error) {
      if (error) {
        sys.puts('Encountered error: '+error);
        callback(error);
        return;
      } else {
        count += 1;
        if (count === expected) {
          callback();
        }
      }
    })
  })
}

function subprocess (call, cmd, cwd, callback) {
  sys.puts('command '+call+' '+cmd)
  var buffer = '';
  if (cwd) { var olddir = process.cwd(); process.chdir(cwd);}
  var child = process.createChildProcess(call, cmd);
  if (cwd) { process.chdir(olddir);}
  child.addListener("output", function (data) {
    if (data) { 
      sys.print(data)
      buffer += data; 
    }
  });
  child.addListener("error", function(data) {
    if (data) {
      sys.print(data)
      buffer += data;
    }
  });
  child.addListener("exit", function(code) {
    if (callback) {
      callback(undefined, code, buffer);
    }});
}

buildCommands = {
  darwin:[['./bootstrap', []],
          ['./configure',['--with-js-include=/usr/local/spidermonkey/include', 
                          '--with-js-lib=/usr/local/spidermonkey/lib']],
          ['make', []],
          ['make',['dev']],
          ]
}

function builder (builds, workingDir) {
  var buildqueues = [];
  builds.forEach(function (info) {
    var w = path.join(workingDir, uuid.uuid2().replace('-', ''));
    var buildq = [
      function (callback) {
        subprocess('git', ['clone', info.giturl, w], workingDir, callback)
      },
      function (callback) {
        subprocess('git', ['checkout', info.gitcheckout], w, callback)
      },
      function (callback) {
        subprocess('./bootstrap', [], w, callback)
      },
      function (callback) {
        subprocess('./configure', ['--with-js-include=/usr/local/spidermonkey/include', 
                                   '--with-js-lib=/usr/local/spidermonkey/lib'], w, callback)
      },
      function (callback) {
        subprocess('make', [], w, callback)
      },
      function (callback) {
        subprocess('make', ['dev'], w, callback)
      },
      function (callback) {
        if (info.port && info.port != 5984) {
          var config = path.join(w, 'etc', 'couchdb', 'local_dev.ini')
          fs.readFile(config, function (error, data) {
            fs.writeFile(config, data.replace(';port = 5984', 'port = '+info.port), function (error) {
              if (error) {callback(error)}
              else {callback()}
            })
          })
        } else {
          callback();
        }
      },
      function (callback) {
        subprocess(path.join(w, 'utils', 'run'), [], undefined);
        callback();
      }
      ]
    buildqueues.push(buildq);
  })
  
  var args = []
  buildqueues.forEach(function (q) {
    args.push(function (callback) {
      queue(q, callback)
    })
  })
  
  parallel(args, function (error) {
    sys.puts('finished')
  })
  
}

exports.builder = builder;
exports.subprocess = subprocess;
exports.queue = queue;
exports.parallel = parallel;

// builder([
//   {name:"file_work", 
//    giturl:"git://github.com/Damienkatz/couchdb.git",
//    gitcheckout:"57904bb1030260b91f18668b3ffbadd7ed954e0d",
//    arch:"darwin",
//   },
//   {name:"trunk",
//    giturl:"git://github.com/apache/couchdb.git",
//    gitcheckout:"HEAD",
//    arch:"darwin", 
//    port:5985,
//   },
//   ], path.join(__dirname, "builds"))
