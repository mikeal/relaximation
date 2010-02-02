var sys = require("sys");
var tcp = require("tcp");
var client = require("./client");
var optionparser = require("./optionparser");

var opts = new optionparser.OptionParser();
opts.addOption('-p', '--port', "number", 'port', undefined, "Port to run client service on.");
options = opts.parse();

var server = tcp.createServer(function (socket) {
  socket.setEncoding("utf8");
  socket.addListener("receive", function (data) {
    if (data == "getMeantime") {
      socket.send(JSON.stringify(client.getMeantime()))
    } else if (JSON.parse(data)[0] == "start") {
      var cmd = JSON.parse(data);
      client.start(cmd[1], 0, cmd[2]);
    }
  });
  socket.addListener("close", function(errorno) {
    sys.puts(errorno);
  })
  socket.addListener("eof", function () {
    socket.send("goodbye\r\n");
    socket.close();
    process.exit();
  });
});
server.listen(options.port, "localhost");