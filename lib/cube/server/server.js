var util        = require("util"),
    url         = require("url"),
    http        = require("http"),
    dgram       = require("dgram"),
    websocket   = require("websocket"),
    websprocket = require("websocket-server"),
    io = require('socket.io'),
    mongodb     = require("mongodb"),
    querystring = require("querystring");

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
      endpoints = {ws: [], http: [], udp: []},
      udp = dgram.createSocket("udp4"),
      mongo = new mongodb.Server(options["mongo-host"], options["mongo-port"]),
      db = new mongodb.Db(options["mongo-database"], mongo),
      id = 0;

  io = io.listen(primary);
  io.set('log level', 1);

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
              var channel = endpoint;
              if(message.socket_id) {
                channel += "::" + message.socket_id;
                socket.emit(channel, response);
              } else {
                io.sockets.emit(channel, response);
              }
            }
          }

          callback.id = ++id;

          return e.dispatch(message, callback);
        }
      }
    });
  }

  // Register HTTP listener.
  primary.on("request", function(request, response) {
    var u           = url.parse(request.url),
        importPath  = /^\/[0-9][0-9a-z]{5}(\/import)?$/;

    util.log(request.connection.remoteAddress + " " + request.url);

    if ((request.method === "POST") && !!u.pathname.match(importPath)) {
      var body = '',
          data;

      request.on('data', function (chunk) {
        body += chunk;
      });

      request.on('end', function () {
        data = querystring.parse(body);

        // Forward messages to the appropriate endpoint, or 404.
        for (var i = -1, n = endpoints.http.length, e; ++i < n;) {
          if ((e = endpoints.http[i]).match(u.pathname, request.method)) {
            return e.dispatch(request, response, data);
          }
        }
      });

    } else {

      // Forward messages to the appropriate endpoint, or 404.
      for (var i = -1, n = endpoints.http.length, e; ++i < n;) {
        if ((e = endpoints.http[i]).match(u.pathname, request.method)) {
          return e.dispatch(request, response);
        }
      }
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.end("404 Not Found");
    }
  });

  // Register UDP listener.
  udp.on("message", function(msg, rinfo) {
    //console.log("server got: " + msg + " from " + rinfo.address + ":" + rinfo.port);
    e = endpoints.udp[0];
    if (e) {
      return e.dispatch(JSON.parse(msg));
    }
  });

  server.start = function() {
    // Connect to mongodb.
    util.log("starting mongodb client");
    dbCallback = function(error) {
      if (error) throw error;
      server.register(db, endpoints);
    }
    db.open(function(error) {
      if (options["mongo-username"] && options["mongo-password"]) {
          db.authenticate(options["mongo-username"], options["mongo-password"], function(error, success) {
              if (success) {
                  dbCallback(null);
              }
              else {
                  var authError = new Error("Could not authenticate with mongo");
                  dbCallback(authError);
              }
          })
      }
      else {
          dbCallback(error);
      }
    });

    // Start the server!
    util.log("starting http server on port " + options["http-port"]);
    primary.listen(options["http-port"]);

    if (options["udp-port"]) {
      // Start the UDP server!
      util.log("starting udp server on port " + options["udp-port"]);
      udp.bind(options["udp-port"]);
    }
  };

  return server;
};
