var request = require('./request')
  , h = {'content-type':'application/json', 'accept':'applications/json'}
  ;

exports.getinfo = function (uri, options) {
  if (uri[uri.length - 1] !== '/') uri += '/';
  
  request({uri:uri, headers:h}, function (err, resp, body) {
    options.dbinfo = JSON.parse(body);
  })
  request({uri:uri+'_config', headers:h}, function (err, resp, body) {
    var dbconfig = JSON.parse(body);
    for (i in dbconfig) {
      if (i.indexOf('auth') !== -1) delete dbconfig[i];
      else {
        for (x in dbconfig[i]) {
          if (x.indexOf('auth') !== -1) delete dbconfig[i][x];
        }
      }
    }
    options.dbconfig = dbconfig;
  })
}

