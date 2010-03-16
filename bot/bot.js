var couchdb = require('node-couchdb');

function startBot(options, db, callback) {
  changes = db.changesStream({include_docs:true});
  changes.addListener("data", function (data) {
    var doc = data.doc;
    if (doc && doc.type === "job" && !doc.locked) {
      options.handleJob(doc, db);
    }
  })
  changes.addListener("end", function () {
    sys.puts('Restarting, lost changes feed.')
    startBot(options, db);
  })
  if (callback) {
    callback(undefined)
  }
}

function getBot(options, callback) {
  var uri = url.parse(options.couchdb);
  var db = couchdb.createClient(uri.port, uri.hostname).db(uri.pathname.replace('/',''))
  if (options.name) {
    db.getDoc('client:'+options.name, function (error, doc) {
      if (!error) {
        options._rev = doc._rev;
      } 
      db.saveDoc('client:'+options.name, options, function (error, info) {
        options._rev = info.rev;
        options._id = info.id;
        startBot(options, db, callback);
      })
    })
  }
}
