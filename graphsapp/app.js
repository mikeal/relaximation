var couchapp = require('couchapp-0.2.0'),
    path = require('path');

ddoc = {_id:'app',templates:{},modules:{},shows:{}}

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'))
couchapp.loadFiles(ddoc.templates, path.join(__dirname, 'templates'))
couchapp.loadModules(ddoc.modules, path.join(__dirname, 'modules'))

ddoc.shows.writeTest = function (doc, req) {
  var mustache = require('modules/mustache').Mustache;
  var ddocPath = '/' + req.path.slice(0, 3).join('/');
  var body = [mustache.to_html(this.templates['head.mustache'], {path:ddocPath}), 
              mustache.to_html(this.templates['writeTest.mustache'], {results:JSON.stringify(doc.results),
                                                                      clients:doc.clients}),
              this.templates['foot.mustache']];
  return body.join('\n')
}
ddoc.shows.writeReadTest = function (doc, req) {
  var mustache = require('modules/mustache').Mustache;
  var ddocPath = '/' + req.path.slice(0, 3).join('/');
  var body = [mustache.to_html(this.templates['head.mustache'], {path:ddocPath}), 
              mustache.to_html(this.templates['writeReadTest.mustache'], {results:JSON.stringify(doc.results),
                                                                          rclients:doc.rclients, 
                                                                          wclients:doc.wclients,
                                                                          clients:doc.clients}),
              this.templates['foot.mustache']];
  return body.join('\n')
}
ddoc.shows.compareWriteTest = function (doc, req) {
  var mustache = require('modules/mustache').Mustache;
  var ddocPath = '/' + req.path.slice(0, 3).join('/');
  var body = [mustache.to_html(this.templates['head.mustache'], {path:ddocPath}), 
              mustache.to_html(this.templates['compareWriteTest.mustache'], {results:JSON.stringify(doc.results),
                                                                             recurrence:doc.recurrence,
                                                                             clients:doc.clients}),
              this.templates['foot.mustache']];
  return body.join('\n')
}
ddoc.shows.compareWriteReadTest = function (doc, req) {
  var mustache = require('modules/mustache').Mustache;
  var ddocPath = '/' + req.path.slice(0, 3).join('/');
  var body = [mustache.to_html(this.templates['head.mustache'], {path:ddocPath}), 
              mustache.to_html(this.templates['compareWriteReadTest.mustache'], {results:JSON.stringify(doc.results),
                                                                             recurrence:doc.recurrence,
                                                                             wclients:doc.wclients,
                                                                             rclients:doc.rclients}),
              this.templates['foot.mustache']];
  return body.join('\n')
}

exports.app = ddoc