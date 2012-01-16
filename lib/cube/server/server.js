var util = require("util"),
    url = require("url"),
    http = require("http"),
    websocket = require("websocket"),
    websprocket = require("websocket-server"),
    io = require('socket.io'),
    mongodb = require("mongodb");

// Don't crash on errors.
process.on("uncaughtException", function(error) {
  util.log(error.stack);
});

// And then this happened:
websprocket.Connection = require("../../../node_modules/websocket-server/lib/ws/connection");

// Configuration for WebSocket requests.
var wsOptions =  {
  maxReceivedFrameSize: 0x10000,
  maxReceivedMessageSize: 0x100000,
  fragmentOutgoingMessages: true,
  fragmentationThreshold: 0x4000,
  keepalive: true,
  keepaliveInterval: 20000,
  assembleFragments: true,
  disableNagleAlgorithm: true,
  closeTimeout: 5000
};

module.exports = function(options) {
  var server = {},
      primary = http.createServer(),
      endpoints = {ws: [], http: []},
      mongo = new mongodb.Server(options["mongo-host"], options["mongo-port"]),
      db = new mongodb.Db(options["mongo-database"], mongo),
      id = 0;

  io = io.listen(primary);
  io.set('loglevel', 0);

  io.sockets.on('connection', connect);

  function connect(socket) {
    socket.on('message', function(message) {
      var message = JSON.parse(message);
      var endpoint = message.endpoint;
      util.log(socket.handshake.address.address + " " + endpoint);

      // Forward messages to the appropriate endpoint, or close the connection.
      for (var i = -1, n = endpoints.ws.length, e; ++i < n;) {
        if ((e = endpoints.ws[i]).match(endpoint)) {

          function callback(response) {
            if (!socket.disconnected) {
              if(message.socket_id) { response.socket_id = message.socket_id; }
              console.log("RESPONSE: " + JSON.stringify(response));
              socket.send(JSON.stringify(response));
            }
          }

          callback.id = ++id;

          console.log("REQUEST: " + JSON.stringify(message));
          return e.dispatch(message, callback);
        }
      }
    });
  }

  // Register HTTP listener.
  primary.on("request", function(request, response) {
    var u = url.parse(request.url);
    util.log(request.connection.remoteAddress + " " + u.pathname);

    // Forward messages to the appropriate endpoint, or 404.
    for (var i = -1, n = endpoints.http.length, e; ++i < n;) {
      if ((e = endpoints.http[i]).match(u.pathname, request.method)) {
        return e.dispatch(request, response);
      }
    }

    response.writeHead(404, {"Content-Type": "text/plain"});
    response.end("404 Not Found");
  });

  server.start = function() {
    // Connect to mongodb.
    util.log("starting mongodb client");
    db.open(function(error) {
      if (error) throw error;
      server.register(db, endpoints);
    });

    // Start the server!
    util.log("starting http server on port " + options["http-port"]);
    primary.listen(options["http-port"]);
  };

  return server;
};
