var sys = require('sys');

exports.Options = function (defs) {
  this.registry = {}
  for (i in defs) {
    if (!defs[i].name) defs[i].name = i
    this.add(defs[i])
  }
}
exports.Options.prototype.help = function () {
  sys.puts("HELP!")
  sys.puts("")
  var lines = [];
  for (i in this.registry) {
    
    var o = this.registry[i]
      , line = '    '
      , biglen = 0;
      ;
      
    if (i !== o.short) {
      line += o.name;
      if (o.short) line += (" -"+o.short+" ");
      else line += "    ";
      line += ("--"+o.name+" ");
      if (o.help) line += o.help;
      lines.push(line)
    }
    
  }
  sys.puts(lines.join('\n'))
  process.exit();
}
exports.Options.prototype.add = function (def) {
  if (def["default"] !== undefined) {
    if (def["default"] === true || def["default"] === false) def.type = 'bool';
    else if (typeof def["default"] === 'number') def.type = 'number';
    else if (typeof def["default"] === 'string') def.type = 'string';
  }
  
  this.registry[def.name] = def;
  if (def.short) this.registry[def.short] = def;
}
exports.Options.prototype._handle = function (name, value) {
  if (this.registry[name].type === 'bool') return !this.registry["default"];
  if (this.registry[name].type === 'number') {
    if (value.indexOf('.') !== -1) return parseFloat(value);
    else return parseInt(value);
  }
  if (this.registry[name].type === 'string') return value;
}
exports.Options.prototype.run = function () {
  var args = process.argv
    , results = {}
    ;
    
  for (i in this.registry) results[i] = this.registry[i]["default"];
  args.shift();
  results.scriptName = args.shift();
  
  // if (args.length == 0) return this.help();

  while (args.length > 0) {
    if (['help', '-h', '--help'].indexOf(args[0]) !== -1) return this.help();
    
    if (args[0].slice(0, '--'.length) == '--')  {
      var name = args.shift().slice('--'.length);
      if (name.indexOf('=') !== -1) {
        value = name.slice(name.indexOf('=') + 1); 
        name = name.slice(0, name.indexOf('=')); 
      } else {
        if (this.registry[name].type !== 'bool') value = args.shift();
      }
      results[name] = this._handle(name, value);
    } else if (args[0].slice(0, '-'.length) === '-')  {
      var name = args.shift().slice('-'.length);
      if (name.indexOf('=') !== -1) {
        value = name.slice(name.indexOf('=') + 1); 
        name = name.slice(0, name.indexOf('=')); 
      } else {
        value = args.shift();
      }
      results[name] = this._handle(name, value);
    } else {
      throw new Error("Could not process argument '"+args[0]+"'")
    }
  }
  return results;
}

exports.createOptions = function (defs) {
  return new exports.Options(defs);
}
