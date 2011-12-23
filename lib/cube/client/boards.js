cube.boards = function(url) {
  var socket,
      interval;

  var boardList = document.getElementById("boards");

  function message(message) {
    var data = JSON.parse(message.data);

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
    socket = new WebSocket(url);
    socket.onopen = load;
    socket.onmessage = message;
    if (!interval) interval = setInterval(ping, 5000);
  }

  function ping() {
    if (socket.readyState == 1) {
      socket.send(JSON.stringify({type: "ping"}));
    } else if (socket.readyState > 1) {
      reopen();
    }
  }

  function load() {
    if (socket && socket.readyState == 1) {
      socket.send(JSON.stringify({type: "load"}));
    }
  }

  reopen();
};
