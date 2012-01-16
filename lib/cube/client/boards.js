cube.boards = function(host, path) {
  var socket,
      endpoint = path,
      interval;

  var boardList = document.getElementById("boards");

  function message(message) {
    var data = message;

    switch(data.type) {
      case "add": {
        var board = data.board;
        var id = board._id.toString(36);

        var li = document.createElement("li");

        var selection = d3.select(li)
          .attr("class", "board-item");


        var link = selection.append("a")
          .text(id)
          .attr("href", "http://" + document.location.host + "/" + id);

        var count = selection.append("span")
          .text(" (" + board.pieces.length + ")");

        boardList.appendChild(selection.node());
      }
    }
  }

  function reopen() {
    if (socket) {
      socket.close();
    }

    socket = io.connect(host);
    socket.on(endpoint, message);
    socket.on('connect', load);
  }

  function load() {
    if (socket && socket.socket.connected) {
      socket.send(JSON.stringify({type: "load", endpoint: endpoint}));
    }
  }

  reopen();
};
