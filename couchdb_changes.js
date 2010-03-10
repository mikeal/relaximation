var sys = require('sys'),
    http = require('http'), 
    url = require('url'),
    querystring = require("querystring");

String.prototype.endsWith = function(str) {return (this.match(str+"$")==str)};

var Changes = function (uri, options) {
  // Accepts db name or url to _changes
  if (!uri.endsWith('_changes')) {
    if (!uri.endsWith('/')) { uri += '/'};
    uri += '_changes';
  }
  if (!options) {
    var options = {}
  }
  options.feed = 'continuous'
  this.url = url.parse(uri);
  this.options = options;
  this.h = http.createClient(this.url.port, url.host);
  this.buffer = ''
  var c = this;
  sys.puts(this.url.pathname+'?'+querystring.stringify(options))
  
  var changesHandler = function (data) {
    sys.puts(data)
    if (data.indexOf('\n')) {
      var chunks = data.split('\n');
      if (c.buffer) {
        chunks[0] = c.buffer + chunks[0];
        c.buffer = null;
      }
    } else {
      if (c.buffer) {
        data = c.buffer + data;
        c.buffer = null;
      }
      var chunks = [data];
    }
    for (i = 0; i < chunks.length; i += 1) {
      var chunk = chunks[i];
      if (chunk) {
        try {
          var obj = JSON.parse(chunk);
        } catch(e) {
          if (i != (chunks.length -1)) {
            throw "For some reason I think this is a chunk "+chunk;
          } else {
            c.buffer = chunk;
          } 
        }
        if (obj) { c.emit('change', obj); }
      } 
    }
  }
  this.h.request("GET", this.url.pathname+'?'+querystring.stringify(options), 
                  {'accept':'application/json'})
    .finish(function(response) {response.addListener('body', changesHandler)});
}
sys.inherits(Changes, process.EventEmitter);

exports.Changes = Changes;

// var test = new Changes('http://localhost:5984/testbot/_changes');
// test.addListener('change', function (obj) {sys.puts(JSON.stringify(obj))});