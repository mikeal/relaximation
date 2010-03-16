var bot = require('./bot');

var jobtypes = ['compare_write_and_read']

function compareWriteAndRead () {
  var testmodule = require('../tests/compare_write_and_read');
  testmodule.runTest(doc);
}

function cli (options) {
  options.handleJob = function (doc, db) {
    if (jobtypes.indexOf(doc.jobtype) != -1) {
      doc.locked = [options._id, options._rev]
      db.saveDoc(doc, function (error, id) {
        if (error) {return; /* Someone got here first */ }
        compareWriteAndRead(doc);
      })
    }
  }
}