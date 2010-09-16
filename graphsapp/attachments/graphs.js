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

var capitalize = function(s) {
  return s.replace( /(^|\s)([a-z])/g , function(m,p1,p2){ return p1+p2.toUpperCase(); } );
 };

var createResponseTimeLines = function (results) {
  var lines = {}
  results.forEach(function (result) {
    for (i in result) {
      if (!lines[i]) lines[i] = {label:i, data:[]}
      var r = result[i];
      if (r.clients) {
        if (r.last > r.average) {
          r.average = r.lase;
        } 
        var l = [r.timeline, r.average];
        l.r = r;
        lines[i].data.push(l);
      }
    }
  })  
  return lines;
}

var createRPSLines = function (results) {
  var lines = {};
  results.forEach(function (result) {
    for (i in result) {
      if (!lines[i]) lines[i] = {label:i, data:[]}
      var prevIndex = lines[i].data.length - 1
        , prev = lines[i].data[prevIndex] ? lines[i].data[prevIndex].r : null
        , curr = result[i]
        , requests = (curr.totalRequests - (prev ? prev.totalRequests : 0))
        , time = (curr.timeline - (prev ? prev.timeline : 0))
        , rps = requests / (1 - ( 1000 - time ) / 1000 )
        ;
      var l = [curr.timeline, requests];
      l.r = curr;
      lines[i].data.push(l);
    }
    prevIndex += 1;
  })  
  return lines;
}

var plot = function (selector, results, options) {
  var lines = []  
  if ($(selector+" tbody").length === 0) {
    for (i in results) lines.push(results[i]);
    $.plot($(selector), lines, options);
    
    $(selector+" tr").each(function (a, b) {
      var key = $(b).find('td.legendLabel').text();
      $(b).append('<input type="checkbox" name="' + key + '" checked="checked" id="id' + key + '">');
    })
    
  } else {
    var checked = {}
    $(selector).find('input').each(function () {
      checked[$(this).attr("name")] = $(this).attr("checked") ? true : false;
      if (checked[$(this).attr("name")]) lines.push(results[$(this).attr("name")]);
    })
    
    $.plot($(selector), lines, options);
    $.each(checked, function (key, value) {
      if (checked[key]) { 
        $(selector+' td:contains("'+key+'")').parent().append('<input type="checkbox" name="' + key + '" checked="checked" id="id' + key + '" />');
      } else {
        $(selector+' tbody').append(
        '<tr><td class="legendColorBox"><div style="border:1px solid #ccc;padding:1px"><div style="width:4px;height:0;border:5px solid rgb(205,201,201);overflow:hidden"></div></div></td><td class="legendLabel">'+key+'</td></tr>'
      )
        $(selector+' td:contains("'+key+'")').parent().append('<input type="checkbox" name="' + key + '" id="id' + key + '" />');
      }
    })
  }
  
  $(selector+" tr").find("input").click(function () {plot(selector, results, options)});
}

var options = { series: {
                  lines: { show: true }
                  , points: { show: true }
                }
              , grid: { hoverable: true, clickable: true },
              }

function showTooltip(x, y, contents) {
  $('<div id="tooltip">' + contents + '</div>').css( {
      position: 'absolute',
      display: 'none',
      top: y + 5,
      left: x + 5,
      border: '1px solid #fdd',
      padding: '2px',
      'background-color': '#fee',
      opacity: 0.80
  }).appendTo("body").fadeIn(200);
}

var tooltipMessage = function (item) {
  var label = item.series.label
    , prev = (item.dataIndex !== 0) ? item.series.data[item.dataIndex - 1].r : null
    , curr = item.series.data[item.dataIndex].r
    , requests = (curr.totalRequests - (prev ? prev.totalRequests : 0))
    , time = (curr.timeline - (prev ? prev.timeline : 0))
    , rps = requests / (1 - ( 1000 - time ) / 1000 )
    , ms = curr.average
    , elapsed = curr.timeline
    , message = ''
    ;

  message += '<div style="text-align:center"><strong>' + item.series.label + '</strong></div><table><tr><td><strong>' 
  if (ms < 1000) {
    message += ms + "</strong></td><td>milleseconds average</td></tr><tr><td><strong>"
  } else {
    message += (ms / 1000) + "</strong></td><td>seconds average</td></tr><tr><td><strong>"
  }
  message += rps + "</strong></td><td>requests per second</td></tr><tr><td><strong>"
  message += curr.totalRequests + '</strong></td><td>total requests</td></tr><tr><td><strong>'
  if (elapsed < 1000) {
    message += elapsed + "</strong></td><td>milleseconds elapsed</td></td></tr><td><strong>"
  } else {
    message += (elapsed / 1000) + "</strong></td><td>seconds elapsed</td></tr><td><strong>"
  }
  message += curr.clients + "</strong></td><td>clients</td></tr>"
  message += '</table>'
  return message;  
}

var previousPoint;
              
var plothover = function (results) {
  return function (event, pos, item) {
    $("#x").text(pos.x.toFixed(2));
    $("#y").text(pos.y.toFixed(2));
    if (item) {
      if (previousPoint != item.datapoint) {
        previousPoint = item.datapoint;
        $("#tooltip").remove();
        showTooltip(item.pageX, item.pageY, tooltipMessage(item));
      }
    }
    else {
      $("#tooltip").remove();
      previousPoint = null;            
    }
  };
}
var app = {};

app.index = function () {
  
}
app.showGraph = function (id) {
  request({url:'/api/'+id}, function (err, doc) {
    if (err) throw err;
    var s = doc.scriptName.split('/');
        s = s[s.length - 1];
    $('div#page-type').text(s); 
    var c = 0;
    for (i in doc) {
      var info = $('div#page-info');
      if ((typeof doc[i] === "number" || typeof doc[i] == "string") 
           && (i.length !== 1) && (i[0] !== '_') && i !== 'type'
          ) {
        info.append('<span class="info-key">'+i+'</span><span class="info-value">'+doc[i]+'</span>');
        c += 1;
        if (c === 3) {
          c = 0
          info.append('<br>')
        }
      }
    }
    
    
    var results = createResponseTimeLines(doc.results);
    plot("div#responsetime", results, options);
    $("div#responsetime").bind("plothover", plothover(doc.results));
    
    var results = createRPSLines(doc.results);
    plot("div#rps", results, options);
    $("div#rps").bind("plothover", plothover(doc.results));
    
    var addConfig = function (c, config) {
      for (i in config) {
        var section = c.append('<div class="config-section">['+i+']</div>')
        if (typeof config[i] !== "object") console.log(i);
        for (x in config[i]) {
          section.append('<span class="config-key">'+x+'</span><span class="config-value">'+config[i][x]+'</span><br>')
        }
      }
    }
    
    if (doc.dbconfig) {
      
      $('div#info').append('<h2>Info</h2><div id="dbinfo"><span class="info-key">CouchDB version</span><span class="info-value">'+doc.dbinfo.version+'</span><br></div><h3>Configuration</h3><div id="dbconfig" />')
      addConfig($('div#dbconfig'), doc.dbconfig);
      
    } else if (doc.info1) {
      $('div#info').append('<h2>'+capitalize(doc.name1)+
        ' Info</h2><div id="dbinfo"><span class="info-key">CouchDB version</span><span class="info-value">'+
        doc.info1.dbinfo.version+'</span><br></div><h3>'+
        capitalize(doc.name1)+' Configuration</h3><div id="dbconfig1" /><br><br>'
       );
      addConfig($('div#dbconfig1'), doc.info1.dbconfig);
      
      $('div#info').append('<h2>'+capitalize(doc.name2)+
        ' Info</h2><div id="dbinfo"><span class="info-key">CouchDB version</span><span class="info-value">'+
        doc.info2.dbinfo.version+'</span><br></div><h3>'+
        capitalize(doc.name2)+' Configuration</h3><div id="dbconfig1" />'
       );
      addConfig($('div#dbconfig1'), doc.info2.dbconfig);
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
