var couchapp = require('../../node.couch.js/couchapp/lib/couchapp'),
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

exports.app = ddoc