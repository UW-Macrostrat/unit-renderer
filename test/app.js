var d3 = require("d3"),
    ur = require("../index.js");

// Temporary way to toggle between unit and section view
d3.select("button").on("click", function(d) {
  d3.event.preventDefault();
  adjust.graphic.swapViews();
});


// THIS IS A PLACEHOLDER
var chunk = window.location.hash.replace("#/", "");

if (chunk.indexOf("section=") > -1) {
  // We have section
  var section = chunk.replace("section=", "");
  ur.findSectionColumn(section);
} else if (chunk.indexOf("column=") > -1) {
  // We have a column
  var column = chunk.replace("column=", "");
  ur.getStrats(column);
} else {
  // Punt
  ur.findSectionColumn(4258, "section");
}


