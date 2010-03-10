var sys = require('sys'),
    os = require('./common/os'),
    path = require('path'),
    assert = require('assert'),
    events = require('events'),
    uuid = require('./common/uuid');

var debugging = false;
    
var Builder = function (workingDir) {
  if (!workingDir) { workingDir = path.join(process.cwd(), 'builddir-'+uuid.uuid2().replace('-',''))}
  this.workingDir = workingDir;
  if (!os.isdir(workingDir)) {
    os.mkdir(workingDir);
  }
}
Builder.prototype.getGitSource = function (url, ref) {
  var p = new events.Promise();
  var dir = path.join(this.workingDir, 'git');
  if (!ref) { ref = 'HEAD'}
  p.name = 'git'; p.dir = dir; p.url = url; p.ref = ref;
  setTimeout(function () {
    assert.equal(0,  os.subprocessCall('git', ['clone', url, dir], undefined, undefined, debugging)[0]);
    assert.equal(0,  os.subprocessCall('git', ['checkout', ref], undefined, dir, debugging)[0]);
    p.emitSuccess(dir);
  }, 0);
  return p;
}
Builder.prototype.getTrunkSource = function() {
  var p = new events.Promise
  var dir = path.join(this.workingDir, 'svnTrunk');
  var url = 'http://svn.apache.org/repos/asf/couchdb/trunk';
  p.name = 'trunk'; p.dir = dir; p.url = url;
  setTimeout(function () {
    // assert.equal(0,  os.subprocessCall('svn', ['co', url, dir], undefined, undefined, debugging)[0]);
    assert.equal(0, os.subprocessCall('cp', ['-R', '/Users/mikeal/tmp/relaxtests/svn/trunk', dir])[0])
    p.emitSuccess(dir);
  }, 0);
  return p;
}
Builder.prototype.getReleaseSource = function(version) {
  var url = 'http://svn.apache.org/repos/asf/couchdb/tags/'+version;
  var p = new events.Promise
  var dir = path.join(this.workingDir, 'release');
  p.name = 'release'; p.dir = dir; p.url = url;
  setTimeout(function () {
    // assert.equal(0,  os.subprocessCall('svn', ['co', url, dir], undefined, undefined, debugging)[0]);
    assert.equal(0, os.subprocessCall('cp', ['-R', '/Users/mikeal/tmp/relaxtests/svn/tags/0.10.1', dir])[0])
    p.emitSuccess(path.join(dir));
  }, 0);
  return p;
}
Builder.prototype.build = function (dir) {
  var commands = this.buildCommands[process.platform];
  var p = new events.Promise();
  setTimeout(function () {
    for(i = 0; i < commands.length; i += 1) {
      var cmd = commands[i];
      assert.equal(0,  os.subprocessCall(cmd[0], cmd[1], undefined, dir, debugging)[0], cmd);
    }
    p.emitSuccess(dir);
  }, 0)
  return p;
}
Builder.prototype.configure = function (dir, port) {
  var p = new events.Promise();
  var config = path.join(dir, 'etc', 'couchdb', 'local_dev.ini');
  setTimeout(function() {
    os.write(config, os.read(config).replace(';port = 5984', 'port = '+port)
                                    .replace(';bind_address = 127.0.0.1', 'bind_address = 0.0.0.0'));
    p.emitSuccess(port);
  }, 0);
  return p;
}

Builder.prototype.buildCommands = {
  darwin:[['./bootstrap'],
          ['./configure',['--with-js-include=/usr/local/spidermonkey/include', 
                          '--with-js-lib=/usr/local/spidermonkey/lib']],
          ['make'],
          ['make',['dev']],
          ]
}



var doBuilds = function (startPort) {
  var currentPort = startPort;
  
  var b = new Builder();
  var promises = [// b.getGitSource('git://github.com/mikeal/couchdb.git'), 
                  b.getTrunkSource(),
                  b.getReleaseSource('0.10.1'),
                  ]                
  
  var results = [];
          
  var resultsPromise = new events.Promise();        
                    
  promises.forEach(function(p){
    p.port = currentPort;
    currentPort += 1;
    p.addCallback( function(dir) { 
      sys.puts('Bulding '+p.name)
      b.build(dir).addCallback( function (dir) {
        sys.puts('Configuring '+p.name)
        var pr = b.configure(dir, p.port);
        pr.addCallback(function (port) {
          results.push({name:p.name,port:p.port,dir:p.dir,url:p.url,ref:p.ref});
          if (results.length == promises.length) {
            resultsPromise.emitSuccess(results);
          }
        })
      })
    })
  })
  resultsPromise.wait();
  results.forEach(function(result) {
    result['subprocess'] = process.createChildProcess(path.join(result.dir, 'utils', 'run'));
    result['subprocess'].addListener('error', function(data) {if(data){sys.print(data)}});
  })
  return results
}

sys.puts(JSON.stringify(doBuilds(1111)))


