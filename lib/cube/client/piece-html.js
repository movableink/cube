cube.piece.type.html = function(board) {
  var timeout;

  var html = cube.piece(board)
      .on("size", resize)
      .on("serialize", serialize)
      .on("deserialize", deserialize);

  var div = d3.select(html.node())
      .classed("html", true);

  if (mode == "edit") {
    div.append("h3")
        .attr("class", "title")
        .text("HTML Block");

    var content = div.append("textarea")
        .attr("class", "content")
        .attr("placeholder", "html content…")
        .on("keyup.html", htmlchange)
        .on("focus.html", html.focus)
        .on("blur.html", html.blur);
  } else {
    div
        .style("text-align", "left");
  }

  function resize() {
    var transition = html.transition(),
        innerSize = html.innerSize();

    if (mode == "edit") {
      transition.select(".content")
          .style("width", innerSize[0] - 12 + "px")
          .style("height", innerSize[1] - 34 + "px");
    } else {
      transition
          .style("font-size", innerSize[0] / 12 + "px")
          .style("margin-top", "0px");
          //.style("margin-top", innerSize[1] / 2 + innerSize[0] / 5 - innerSize[0] / 12 + "px");
    }
  }

  function htmlchange() {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(html.edit, 750);
  }

  function serialize(json) {
    json.type = "html";
    json.content = content.property("value");
  }

  function deserialize(json) {
    if (mode == "edit") {
      content.property("value", json.content);
    } else {
      div.html(json.content);
    }
  }

  html.copy = function() {
    return board.add(cube.piece.type.html);
  };

  resize();

  return html;
};
