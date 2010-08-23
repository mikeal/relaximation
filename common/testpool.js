var http = require('http')
  , sys = require('sys')
  , request = require('request')
  ;

exports.createPool = function (options, callback) {
  if (callback) options.callback = callback;
  var validate = function (name, message) {
    if (!options[name]) throw new Error(message);
  }
  
  validate('uri', "Must include uri option for pool.");
  validate('count', "Must include the count option.");
  validate('method', "Must include the request method option.");
  
  var pool = { pools: [], running:true };
  pool.poll = function () {
    var total = 0
      , times = []
      , starttimes = []
      , endtimes = []
      , current = new Date()
      ;
    for (var i=0;i<pool.pools;i+=1) {
      var o = pool.pools[i];
      if (o.endtime) {
        startttimes.push(o.starttime);
        endtime.push(o.endtime);
        times.push(o.endtime - o.starttime);
      }
      total += o.totalRequests;
    } 
    return {times:times, starttimes:starttimes, endtime:endtimes, totalRequests:total};
  }
  pool.end = function () {
    pool.running = false;
    for (var i=0;i<pool.pools;i+=1) {
      pool.pools[i].client.close();
    }
  }
  
  if (!options.headers) options.headers = {};
  options.headers.connection = 'keep-alive';
  if (!options.delay) options.delay = 0;
  
  var d = 0;
  
  for (var i=0;i<options.count;i+=1) {
    d += options.delay;  
    var opts = {totalRequests:0};
    for (i in options) opts[i] = options[i];
    var cb = function (error, resp, body) { 
      opts.starttime = opts._starttime;
      opts.endtime = new Date();
      opts.totalRequests += 1;
      if (opts.callback) opts.callback(error, opts, resp, body);
      opts._starttime = new Date();
      request(opts, cb)
    }
    setTimeout(function () {request(opts, cb);}, d)
    pool.pools.push(opts);
  }
  
  return pool;
}
