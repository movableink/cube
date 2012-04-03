cube.piece.type.sum = function(board, socket) {
  var timeout,
      endpoint = "/1.0/metric/get",
      data = 0,
      format = d3.format(".2s");

  var sum = cube.piece(board)
      .on("size", resize)
      .on("serialize", serialize)
      .on("deserialize", deserialize);

  var div = d3.select(sum.node())
      .classed("sum", true);

  if (mode == "edit") {
    div.append("h3")
        .attr("class", "title")
        .text("Rolling Sum");

    var query = div.append("textarea")
        .attr("class", "query")
        .attr("placeholder", "query expression…")
        .on("keyup.sum", querychange)
        .on("focus.sum", sum.focus)
        .on("blur.sum", sum.blur);

    var time = div.append("div")
        .attr("class", "time")
        .text("Time Range:")
      .append("select")
        .on("change.sum", sum.edit)
        .on("focus.sum", sum.focus)
        .on("blur.sum", sum.blur);

    time.selectAll("option")
        .data([
          {description: "Seconds @ 10", value: 1e4},
          {description: "Minutes @ 5", value: 3e5},
          {description: "Hours", value: 36e5},
          {description: "Days", value: 864e5},
          {description: "Weeks", value: 6048e5},
          {description: "Months", value: 2592e6}
        ])
      .enter().append("option")
        .property("selected", function(d, i) { return i == 1; })
        .attr("value", cube_piece_areaValue)
        .text(function(d) { return d.description; });
  }

  function resize() {
    var innerSize = sum.innerSize(),
        transition = sum.transition();

    if (mode == "edit") {
      transition.select(".query")
          .style("width", innerSize[0] - 12 + "px")
          .style("height", innerSize[1] - 58 + "px");

      transition.select(".time select")
          .style("width", innerSize[0] - 100 + "px");
    } else {
      transition
          .style("font-size", innerSize[0] / 5 + "px")
          .style("line-height", innerSize[1] + "px")
          .text(format(data));
    }
  }

  function redraw() {
    div.text(format(data));
    return true;
  }

  function querychange() {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(sum.edit, 750);
  }

  function serialize(json) {
    var t = time.property("value").split("/");
    json.type = "sum";
    json.query = query.property("value");
    json.time = {range: +t[0], step: +t[1]};
  }

  function deserialize(json) {
    var socketId = Math.random() * Math.pow(10, 16);

    if (!json.time.range) json.time = {range: json.time, step: 3e5};
    if (mode == "edit") {
      query.property("value", json.query);
      time.property("value", json.time.range + "/" + json.time.step);
    } else {
      var dt = json.time.step,
          t1 = new Date(Math.floor(Date.now() / dt) * dt),
          t0 = new Date(t1 - json.time.range);

      data = 0;

      if (timeout) timeout = clearTimeout(timeout);

      load();
      socket.on([endpoint, socketId].join('::'), store);

      function load() {
        socket.send(JSON.stringify({
          endpoint: endpoint,
          socket_id: socketId,
          expression: json.query,
          start: cube_time(t0),
          stop: cube_time(t1),
          step: dt
        }));
        timeout = setTimeout(function() {
          deserialize(json);
        }, t1 - Date.now() + dt + 4500 + 1000 * Math.random());
      }

      function store(message) {
        data += message.value;
        d3.timer(redraw);
      }
    }
  }

  sum.copy = function() {
    return board.add(cube.piece.type.sum);
  };

  resize();

  return sum;
};
