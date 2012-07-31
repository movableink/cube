db.createCollection("boards");

["ojos"].forEach(function(type) {
  var event = type + "_events", metric = type + "_metrics";
  db.createCollection(event);
  db[event].ensureIndex({t: 1});
  db[event].ensureIndex({"d.type": 1, t: 1, "d.requestTime": 1});
  db.createCollection(metric, {capped: true, size: 1e7, autoIndexId: true});

  db[metric].ensureIndex({"i": 1, "_id.e": 1, "_id.l": 1, "_id.t": 1});
  db[metric].ensureIndex({"i": 1, "_id.l": 1, "_id.t": 1});
});
