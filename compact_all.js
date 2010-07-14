try {
  require('request');
} catch(e) {
  require('sys').debug('You must install request http://github.com/mikeal/node-utils/tree/master/request/')
  process.exit();
}

var request = require('request')
  , sys = require('sys');
  
if (process.argv[process.argv.length - 1].slice(0, 4) === 'http') {
  var uri = process.argv[process.argv.length - 1];
  sys.debug('DBURI '+uri)
} else {
  var uri = 'http://localhost:5984/'
  sys.debug('No DBURI was set, using '+uri)
}

if (!uri[uri.length - 1] === '/') uri += '/'

request({uri:uri + '_all_dbs'}, function (error, resp, body) {
  if (error) throw error
  var dbs = JSON.parse(body)
  if (!dbs.length) throw "Did not get databases "+body;
  var i = 0;
  var compact = function () {
    if (i === dbs.length) {
      sys.debug('All compactions finished');
      return;
    }
    var self = this;
    var db = dbs[i];
    sys.debug('Starting compaction of '+db)
    request({uri:uri + db + '/_compact', method:"POST"}, function (error, resp, body) {
      if (error) throw error
      if (body !== '{"ok":true}\n') {
        sys.debug('Could not start compaction '+body);
        i += 1;
        compact();
      }
      var check = function () {
        request({uri:uri + db}, function (error, resp, body) {
          if (error) throw error
          if (JSON.parse(body).compact_running === true) {
            setTimeout(check, 100)
          } else {
            sys.debug('Compaction finished.')
            i += 1
            compact()
          }
        }) 
      }
      check();
    })
  }
  compact();
})