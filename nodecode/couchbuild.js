var sys = require('sys'),
    os = require('./os'),
    path = require('path'),
    assert = require('assert'),
    events = require('events'),
    uuid = require('./uuid');

var debugging = true;
    
var Builder = function (workingDir) {
  if (!workingDir) { workingDir = path.join(process.cwd(), uuid.uuid2().replace('-',''))}
  this.workingDir = workingDir;
  if (!os.isdir(workingDir)) {
    os.mkdir(workingDir);
  }
}
Builder.prototype.getGitSource = function (url, ref) {
  var p = new events.Promise();
  var dir = path.join(this.workingDir, 'git');
  if (!ref) { ref = 'HEAD'}
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
  setTimeout(function () {
    assert.equal(0,  os.subprocessCall('svn', ['co', url, dir], undefined, undefined, debugging)[0]);
    p.emitSuccess(dir);
  }, 0);
  return p;
}
Builder.prototype.getReleaseSource = function(version) {
  var url = 'http://svn.apache.org/repos/asf/couchdb/tags/'+version;
  var p = new events.Promise
  var dir = path.join(this.workingDir, 'release');
  setTimeout(function () {
    assert.equal(0,  os.subprocessCall('svn', ['co', url, dir], undefined, undefined, debugging)[0]);
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
      p.emitSuccess(dir);
    }
  }, 0)
  sys.puts('return')
  return p;
}
Builder.prototype.configure = function (dir) {
  var p = new events.Promise();
  var config = path.join(dir, 'etc', 'couchdb', 'local_dev.ini');
  setTimeout(function() {
    os.write(config, os.read(config).replace('2984', '1111'));
    p.emitSucces(1111);
  }, 0);
  sys.puts('retConf')
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

var b = new Builder();
var promises = [// b.getGitSource('git://github.com/mikeal/couchdb.git'), 
                // b.getTrunkSource(),
                b.getReleaseSource('0.10.1'),
                ]

var ports = [];
                
for (i=0;i<promises.length;i+=1){
  var p = promises[i];
  p.addCallback( function(dir) { 
    b.build(dir).addCallback( function (dir) {
      var pr = b.configure(dir)
      pr.addCallback( function (port) {
        p.port = port;
        if (ports.length == promises.length) {
          finished(promises);
        }
      })
    })
  })
}

var finished = function (promises) {
  // Tell CouchDB that I have all these boxes running on these ports
  
  sys.puts(ports)
}