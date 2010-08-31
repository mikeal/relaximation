var request = function (options, callback) {
  options.success = function (obj) {
    callback(null, obj);
  }
  options.error = function (err) {
    if (err) callback(err);
    else callback(true);
  }
  options.dataType = 'json';
  $.ajax(options)
}

var app = {};

app.index = function () {
  
}
app.showGraph = function (id) {
  request({url:'/api/'+id}, function (err, doc) {
    if (err) throw err;
    var s = doc.scriptName.split('/');
        s = s[s.length - 1];
    $('#graphType').text(s); 
    if (s === 'test_writes_manydb.js') {
      var line = [];
      doc.results.forEach(function (r) {
        if (r.clients == (doc.clients * doc.dbs)) {
          if (r.last > r.average) {
            a = r.average + (r.last - r.average) / 1000
          } else {
            a = r.average / 1000;
          }
          line.push([r.timeline / 1000, a])
        }
        
      })
      $.plot($("#placeholder"), [line])
    }
  })
}

var a = $.sammy(function () {
  
  var indexRoute = function () {
    this.render('/templates/index.mustache').replace('#content').then(app.index);
  }
  var graphRoute = function () {
    var id = this.params['id'];
    this.render('/templates/graph.mustache').replace('#content').then(function () {
      app.showGraph(id)
    });
  }
  
  // Index of all databases
  this.get('', indexRoute);
  this.get("#/", indexRoute);
  // Database view
  this.get('#/graph/:id', graphRoute);
})

$(function () {a.use('Mustache'); a.run(); });
