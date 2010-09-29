var request = require('../common/request')
  , sys = require('sys')
  ;
  
var h = {'content-type':'application/json', 'accept':'application/json'}
  , rbody = new Buffer(1024 * 1028)
  ;

var testCompaction = function (opts) {
  request({method:'PUT', uri:opts.url+'/compactiontest', headers:h}, function (err, resp, body) {
    if (err) throw err;
    if (resp.statusCode !== 201) sys.puts('Could not create database. '+body)
    
    var c = 0
      , rev
      , uri
      ;
    var doTest = function () {
      if (rev) uri = opts.url+'/compactiontest/testattachment/attached?rev='+rev
      else uri = opts.url+'/compactiontest/testattachment/attached'
      request({method:'PUT', body: rbody, uri:uri}, function (err, resp, body) {
        if (err) throw err;
        if (resp.statusCode !== 201) throw new Error("Did not create attaachment "+body);
        rev = JSON.parse(body).rev
        c += 1;
        sys.print('.')
        if (c < opts.iterations) doTest();
      })
    }
    doTest();
    
    
  })
}



if (require.main === module) {
  var cmdopts = require('../common/cmdopts')
    , opts = cmdopts.createOptions({ url :      { short: "u", "default": "http://localhost:5984",
                                                  help: "CouchDB url to run tests against."
                                                }
                                    , iterations : { short: "i", "default": 500,          
                                                     help: "How many times to overwrite the attachment."
                                                   }
                                    });
  testCompaction(opts.run());
  
}