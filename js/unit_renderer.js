/*
  4. Texture units based on 'lith'
  5. Handle text display properly

  INSERT INTO timescales_intervals (timescale_id, interval_id)  SELECT 11, id FROM `intervals` WHERE interval_type='era'
*/

var d3 = require("d3"),
    _ = require("underscore"),
    getDrawingColumns = require("./computeColumns");

var baseURL = (window.location.hostname === "localhost") ? "http://localhost:5000" : "http://dev.macrostrat.org",
    units = {
      width: 300,
      height: 800
    },
    intervals = {
      width: 50,
      height: 800
    },
    column = {};

var dragStart, transformStart,
    newY = 0.01;

var drag = d3.behavior.drag()
  .origin(function() { 
    var t = d3.select("#timescaleContainer g");
    return {x: 0, y: -newY};
  })
  .on("dragstart", function() {
    dragStart = [d3.event.sourceEvent.pageX, d3.event.sourceEvent.pageY];
    transformStart = d3.transform(d3.select("#timescaleContainer").select("g").attr("transform")).translate;

    d3.event.sourceEvent.stopPropagation();
  })
  .on("drag", function() {
    var currentDrag = [d3.event.sourceEvent.pageX, d3.event.sourceEvent.pageY];
    newY = (dragStart[1] - currentDrag[1]);

    d3.select("#timescaleContainer").select("g")
      .attr("transform", function() {
        return "translate(" + [ 0, parseInt(transformStart[1] + -newY) ] + ")";
      });

    d3.selectAll("#sectionContainer, #stratContainer").selectAll(".crContainer")
      .attr("transform", function() {
        var currentY = d3.transform(d3.select(this).attr("transform")).translate[0];
        return "translate(" + [ currentY, parseInt(transformStart[1] + -newY) ] + ")";
      });
  });


d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};


function findSectionColumn(section_id) {
  d3.json(baseURL + "/api/units?section_id=" + section_id, function(error, data) {
    if (error || data.success.data.length < 1) {
      return alert("Couldn't find section " + section_id + " while retrieving units");
    }
    // Get the column id of the first unit in this section
    getStrats(data.success.data[0].col_id)
  });
}


function getStrats(col_id) {
  getColumnUnits(col_id);
  getColumnSections(col_id);
}


function getColumnUnits(col_id) {
  d3.json(baseURL + "/api/units?response=long&col_id=" + col_id, function(error, data) {
    if (error || data.success.data.length < 1) {
      return alert("Couldn't find column " + col_id + " while retrieving units");
    }
    column.units = data.success.data;

    column.units.sort(function(a, b) { return a.t_age - b.t_age });
  });
}


function getColumnSections(col_id) {
  d3.json(baseURL + "/api/sections?col_id=" + col_id, function(error, data) {
    if (error || data.success.data.length < 1) {
      return alert("Couldn't find column " + col_id + " while retrieving sections");
    }
    // Reformat the data to make drawing code more generic 
    column.sections = data.success.data.map(function(d) {
      return {
        "id": d.id,
        "b_age": d.bottom_age,
        "t_age": d.top_age,
        "strat_name": d.bottom + "-" + d.top,
        "col": col_id,
        "color": "#777777"
      }
    });;

    //!!!!! Temporary code !!!!!!
    column.sections.forEach(function(section1) {
      column.sections.forEach(function(section2) {
        if (section1.id !== section2.id) {
          if (section1.b_age > section2.t_age && section2.b_age > section1.t_age) {
            section1.invalid = true;
            section2.invalid = true;
          }
        }
      });
    });

  // !!!!!!!!!!!!!


    getTimescaleData();

  });
}


function getTimescaleData() {
  var late_age = d3.min(column.sections, function(d) { return d.t_age }),
      early_age = d3.max(column.sections, function(d) { return d.b_age });

  units.scale = d3.scale.linear()
    .domain([late_age, early_age])
    .range([0, 800]);

  d3.json(baseURL + "/api/defs/intervals?timescale=international&rule=loose&early_age=" + early_age + "&late_age=" + late_age, function(error, data) {
    column.intervals = data.success.data;
    drawTimescale(data.success.data);
    setupUnits();
    drawSections();
  });
}


function drawTimescale(data, type) {

  var min = d3.min(data, function(d) { return d.late_age }),
      max = d3.max(data, function(d) { return d.early_age});
  
  var interval_lookup = {
      "era": 0,
      "period": intervals.width * 0.25,
      "epoch": intervals.width * 0.5,
      "age": intervals.width * 0.75
    }

  intervals.interval_lookup = interval_lookup;

  d3.select("#timescaleContainer").select("svg").remove();

  var svg = d3.select("#timescaleContainer").append("svg")
      .attr("width", intervals.width)
      .attr("height", intervals.height)
      .append("g")
        .attr("class", "crContainer")
      .append("g")
        .attr("id", "timescale")
        .attr("data-zoomed", "false");
    
  svg.selectAll(".node")
    .data(data)
  .enter().append("rect")
    .attr("class", "node interval_node")
    .attr("id", function(d) { return "n" + d.id })
    .attr("x", function(d) { return interval_lookup[d.type] })
    .attr("y", function(d) { return units.scale(d.late_age) })
    .attr("width", intervals.width/4)
    .attr("height", function(d) { return units.scale(d.early_age) - units.scale(d.late_age)})
    .style("fill", function(d) { return d.color })
    .call(drag)
    .on("click", function(d) {
      if (d3.event.defaultPrevented) return;
      zoom.go(d.id);
    });

  svg.selectAll(".label")
    .data(data)
  .enter().append("text")
    .attr("class", "label interval_label")
    .attr("id", function(d) { return "nl" + d.id })
    .attr("dy", ".35em")
    .attr("transform", function(d) { return "translate(" + (interval_lookup[d.type] + ((intervals.width * 0.3)/2)) + "," + ((units.scale(d.late_age) + units.scale(d.early_age))/2) + ")rotate(-90)"; })
    .text(function(d) { return d.name; })
    .call(drag)
    .on("click", function(d) {
      if (d3.event.defaultPrevented) return;
      zoom.go(d.id);
    });

  adjust.labels.timescale();

}


function drawSections() {
  var intervalRanks = {
    "era": 0,
    "period": 1,
    "epoch": 2,
    "age": 3
  }

  // This tells us which time interval to zoom to when a section is clickec
  column.sections.forEach(function(d) {
    var containingIntervals = [];
    // Find all the ones that fit
    column.intervals.forEach(function(j) {
      if (j.late_age <= d.t_age && j.early_age >= d.b_age) {
        containingIntervals.push(j);
      }
    });

    // Sort by rank
    containingIntervals.forEach(function(d) {
      d.rank = intervalRanks[d.type];
    });

    containingIntervals.sort(function(a, b) { return b.rank - a.rank });

    // Pick the finest one
    if (containingIntervals.length > 0) {
      d.interval = containingIntervals[0].id
    } else {
     // console.log("Problem with section " + d.id);
    }
  });

  // Remove any old ones
  d3.select("#sectionContainer").select("svg").remove();

// !!!!!!!!! Temporary code
  var data = column.sections.filter(function(section){
    if (!section.invalid) return section
  });
// !!!!!!!!!!!!

  var svg = d3.select("#sectionContainer").append("svg")
    .attr("width", units.width)
    .attr("height", units.height)
    .append("g")
      .attr("class", "crContainer")
    .append("g")
      .attr("id", "section");

  svg.selectAll(".sections")
    .data(data)
  .enter().append("rect")
    .attr("class", "node section_node")
    .attr("id", function(d) { return "s" + d.id })
    .attr("x", 0)
    .attr("y", function(d) { return units.scale(d.t_age) })
    .attr("width", units.width)
    .attr("height", function(d) { return units.scale(d.b_age) - units.scale(d.t_age)})
    .style("fill", function(d) { return d.color })
    .call(drag)
    .on("click", function(d) {
      if (d3.event.defaultPrevented) return;
      if (d.interval) {
        zoom.go(d.interval)
        adjust.graphic.swapViews();
      } else {
        adjust.graphic.swapViews();
      }
    });

  d3.select("#sectionContainer")
    .select(".crContainer")
  .append("g")
    .attr("id", "unit_labels")
  .selectAll(".unit_label")
    .data(data)
  .enter().append("text")
    .attr("class", "label unit_label_section")
    .attr("id", function(d) { return "sl" + d.id })
    .attr("dy", ".35em")
    .attr("transform", function(d) { return "translate(" +  (units.width/2)  + "," + (units.scale(d.t_age) + (units.scale(d.b_age) - units.scale(d.t_age))/2) + ")" })
    .style("fill", function(d) { return d.text_color })
    .text(function(d) { return d.strat_name; })
    .call(drag);
  
  adjust.graphic.position();
  adjust.labels.sections();
}


function setupUnits() {
  
  // Remove any old ones
  d3.select("#stratContainer").select("svg").remove();

  d3.select("#stratContainer").append("svg")
    .attr("width", units.width)
    .attr("height", units.height)
    .append("g")
      .attr("class", "crContainer")
    .append("g")
      .attr("id", "section");

  // A convinience for looking up units and sections
  var sectionLookup = {},
      sectionLookup2 = {};

  column.sections.forEach(function(d) {
    sectionLookup[d.id] = [];
    sectionLookup2[d.id] = {};
  });

  column.units.forEach(function(d) {
    sectionLookup[d.section_id].push(d);
  });

  column.sections.forEach(function(d) {
    d.units = sectionLookup[d.id];
  });

  column.sectionLookup = sectionLookup2;

  drawStrats();

}



function drawStrats() {
  column.sections.forEach(function(section) {

 //!!!!!! Temporary code
    if (section.invalid) {
      d3.select("#oddities").append("p").html("Section " + section.id + " overlaps with another section");
      return;
    }
// !!!!!!!
    
    /* Get drawing columns (function imported from getDrawingColumns.js)
        returns {"columns": columns, "units": units}
    */
    var parsed = getDrawingColumns(section.units);

    // The width (px) of one "column" in a section
    var widthUnit = units.width/parsed.columns.length;

    // Keep track of these for use during transitions
    section.units = parsed.units;
    column.sectionLookup[section.id].columns = parsed.columns;
    column.sectionLookup[section.id].widthUnit = widthUnit;

    /*
      Record the first column appearance of each unit (`d.firstCol`) and
      the total number of column appearances of each unit (`d.cols`)
    */
    section.units.forEach(function(unit) {
      unit.firstCol = -1,
      unit.cols = 0;
      parsed.columns.forEach(function(column, columnIndex) {
        if (column.units.indexOf(unit.id) > -1) {
          unit.cols++;
          if (unit.firstCol < 0) {
            unit.firstCol = columnIndex;
          }
        }
      });
    });

    // Find the bad ones
    section.units.forEach(function(d) {
      if (d.t_age > d.b_age) {
        d3.select("#oddities").append("p").html("<a href='http://dev.macrostrat.org/api/units?response=long&id=" + d.id + "'>" + d.strat_name + " <i>(" + d.id + ")</i></a>");
        return;
      }
    });

    // Ignore the bad ones
    var data = section.units.filter(function(d) {
      if (d.b_age > d.t_age) {
        return d;
      }
    });

    // Add the units that are entirely surrounded by another unit to the drawing data
    parsed.inside.forEach(function(n) {
      data.push(JSON.parse(n));
    });

    d3.select("#section")
    .selectAll(".units")
      .data(data)
    .enter().append("rect")
      .attr("class", "node unit_node")
      .attr("id", function(d) { return "u" + d.id })
      .attr("y", function(d) { return units.scale(d.t_age) })
      .attr("height", function(d) { return units.scale(d.b_age) - units.scale(d.t_age)})
      .style("fill", function(d) { return d.color })
      .attr("x", function(d) {
        // Let x be defined by d.firstCol
        if (d.within) {
          return parsed.unitHash[d.withinUnit].firstCol * widthUnit;
        }
        return (d.firstCol) ? d.firstCol * widthUnit : 0;
      })
      .attr("width", function(d) {
        // Let width be definied by d.cols
        if (d.within) {
          return units.width/2;
        }
        return (d.cols) ? d.cols * widthUnit : units.width/2;
      })
      .call(drag)
      .on("click", function(d) {
        if (d3.event.defaultPrevented) return;
        console.log(d);
      })
      .append("title").text(function(d) { return d.strat_name });

    d3.select("#stratContainer")
      .select(".crContainer")
    .append("g")
      .attr("id", "unit_labels")
    .selectAll(".unit_label")
      .data(data)
    .enter().append("text")
      .attr("class", "label unit_label")
      .attr("id", function(d) { return "ul" + d.id })
      .attr("dy", ".35em")
      .style("fill", function(d) { return d.text_color })
      .attr("transform", function(d) { 
        var x = parseFloat(d3.select("#u" + d.id).attr("x")),
            width = parseFloat(d3.select("#u" + d.id).attr("width")),
            y = parseFloat(d3.select("#u" + d.id).attr("y")),
            height = parseFloat(d3.select("#u" + d.id).attr("height"));

        x = (d.containsUnit) ? (units.width/2) + ((width/2)/2) : x + (width/2);
        y = y + (height/2);

        return "translate(" + x  + "," + y + ")" 
      })
      
      .text(function(d) { return d.strat_name; })
      .call(drag);
    
    adjust.labels.units();
    adjust.units.zIndex();
  });
}


var zoom = {
  go: function(id) {
      
    if (d3.select("#n" + id).attr("data-zoomed") === "true") {
      d3.selectAll(".interval_node").filter(function() {
        if (d3.select(this).attr("data-zoomed") === "true") {
          d3.select(this).attr("data-zoomed", "false");
        }
      });
      zoom.out.go();
    } else {
      d3.selectAll(".interval_node").filter(function() {
        if (d3.select(this).attr("data-zoomed") === "true") {
          d3.select(this).attr("data-zoomed", "false");
        }
      });
      d3.select("#n" + id).attr("data-zoomed", "true");

      var scaleY = units.height/(units.scale(d3.select("#n" + id).data()[0].early_age) - units.scale(d3.select("#n" + id).data()[0].late_age)),
          translate = units.scale(d3.select("#n" + id).data()[0].late_age) * scaleY;

      zoom.inn.go(scaleY, translate);
    }

    d3.selectAll(".crContainer").attr("transform", "translate(0,0)");

  },
  
  inn: {
    go: function(scaleF, translate) {
      // Indicate that we are zoomed in
      d3.select("#timescale")
        .attr("data-zoomed", "true");

      this.timescale(scaleF, translate);
      this.sections(scaleF, translate);
      this.units(scaleF, translate);

    },

    timescale: function(scaleF, translate) {
      var x = 0;
      d3.selectAll(".interval_node")
        .transition()
        .duration(1000)
        .each(function(){ ++x; })
        .attr("height", function(d) {
          return (units.scale(d.early_age) - units.scale(d.late_age)) * scaleF;
        })
        .attr("y", function(d) {
          return (units.scale(d.late_age) * scaleF) - translate;
        });

      setTimeout(adjust.labels.timescale, 1100);

      var n = 0;
      // Readjust the time interval labels
      d3.selectAll(".interval_label")
        .transition()
        .duration(1000)
        .each(function(){ ++n; })
        .attr("transform", function(d) { return "translate(" + (intervals.interval_lookup[d.type] + ((intervals.width * 0.3)/2)) + "," + ((((units.scale(d.late_age) + units.scale(d.early_age))/2) * scaleF) - translate) + ")rotate(-90)"; })
        .each("end", function() { if (!--n) { adjust.labels.timescale() }});
    },

    sections: function(scaleF, translate) {
      d3.selectAll(".section_node")
        .transition()
        .duration(1000)
        .attr("height", function(d) { 
          return (units.scale(d.b_age) - units.scale(d.t_age)) * scaleF
        })
        .attr("y", function(d) { 
          return (units.scale(d.t_age) * scaleF) - translate;
        });

      var n = 0;
      // Readjust the unit labels
      d3.selectAll(".unit_label_section")
        .transition()
        .duration(1000)
        .each(function(){ ++n; })
        .attr("transform", function(d) { 
          var origY = (units.scale(d.t_age) + (units.scale(d.b_age) - units.scale(d.t_age))/2);
          return "translate(" +  (units.width/2)  + "," + ((origY * scaleF) - translate)  + ")" 
        })
        .each("end", function() { if (!--n) { adjust.labels.sections() }});
    },

    units: function(scaleF, translate) {
      d3.selectAll(".unit_node")
        .transition()
        .duration(1000)
        .attr("height", function(d) { 
          return (units.scale(d.b_age) - units.scale(d.t_age)) * scaleF
        })
        .attr("y", function(d) { 
          return (units.scale(d.t_age)  * scaleF) - translate;
        });

      var n = 0;
      // Readjust the unit labels
      d3.selectAll(".unit_label")
        .transition()
        .duration(1000)
        .each(function() { ++n; })
        .attr("transform", function(d) { 
          var origY = (units.scale(d.t_age) + (units.scale(d.b_age) - units.scale(d.t_age))/2),
              x = parseFloat(d3.select("#u" + d.id).attr("x")),
              width = parseFloat(d3.select("#u" + d.id).attr("width"));

          x = (d.containsUnit) ? (units.width/2) + ((width/2)/2) : x + (width/2);

          return "translate(" + x + "," + ((origY * scaleF) - translate) + ")" 
        })
        .each("end", function() { if (!--n) { adjust.labels.units() }});
    }
  },

  out: {
    go: function() {
      // Indicate that we are zoomed out
      d3.select("#timescale")
        .attr("data-zoomed", "false");
      
      this.timescale();
      this.sections();
      this.units();
    },

    timescale: function() {
      d3.selectAll(".interval_node")
        .transition()
        .duration(1000)
        .attr("height", function(d) {
          return units.scale(d.early_age) - units.scale(d.late_age);
        })
        .attr("y", function(d) {
          return units.scale(d.late_age);
        });

      var n = 0;
      // Reset the time interval labels
      d3.selectAll(".interval_label")
        .transition()
        .duration(1000)
        .each(function(){ ++n; })
        .attr("transform", function(d) { 
          return "translate(" + (intervals.interval_lookup[d.type] + ((intervals.width * 0.3)/2)) + "," + ((units.scale(d.late_age) + units.scale(d.early_age))/2) + ")rotate(-90)"; 
        })
        .each("end", function() { if (!--n) { adjust.labels.timescale() }});
    },

    sections: function() {
      // Reset the sections
      d3.selectAll(".section_node")
        .transition()
        .duration(1000)
        .attr("y", function(d) { return units.scale(d.t_age) })
        .attr("height", function(d) { return units.scale(d.b_age) - units.scale(d.t_age)});

      var n = 0;
      // Reset the unit labels 
      d3.selectAll(".unit_label_section")
        .transition()
        .duration(1000)
        .each(function(){ ++n; })
        .attr("transform", function(d) { return "translate(" + (units.width/2)  + "," + (units.scale(d.t_age) + (units.scale(d.b_age) - units.scale(d.t_age))/2) + ")" })
        .each("end", function() { if (!--n) { adjust.labels.sections(); }});
    },

    units: function() {
      d3.selectAll(".unit_node")
        .transition()
        .duration(1000)
        .attr("y", function(d) { return units.scale(d.t_age) })
        .attr("height", function(d) { return units.scale(d.b_age) - units.scale(d.t_age)});

      var n = 0;
      // Reset the unit labels 
      d3.selectAll(".unit_label")
        .transition()
        .duration(1000)
        .each(function(){ ++n; })
        .attr("transform", function(d) {
          var x = parseFloat(d3.select("#u" + d.id).attr("x")),
              width = parseFloat(d3.select("#u" + d.id).attr("width")),
              y = parseFloat(d3.select("#u" + d.id).attr("y")),
              height = parseFloat(d3.select("#u" + d.id).attr("height"));

           var x = (d.containsUnit) ? (units.width/2) + ((width/2)/2) : x + (width/2),
               y = y + (height/2)

            return "translate(" + x  + "," + y + ")" 
        })
        .each("end", function() { if (!--n) { adjust.labels.units() }});

    }
  }
}


var adjust = {

  labels: {
    timescale: function() {
      d3.selectAll(".interval_label")
        .style("display", "block");

      d3.selectAll(".interval_label")
        .style("display", function(d) {
          var textWidth = d3.select("#nl" + d.id).node().getBBox().width,
              boxWidth = parseFloat(d3.select("#n" + d.id).attr("height") - 10);

          if (textWidth > boxWidth) {
            return "none";
          } else {
            return "block";
          }
        });
    },

    sections: function() {
      d3.selectAll(".unit_label_section").style("display", "block");

      d3.selectAll(".unit_label_section")
        .style("display", function(d) {
          var textHeight = d3.select("#sl" + d.id).node().getBBox().height,
              boxHeight = parseFloat(d3.select("#s" + d.id).attr("height") - 10);

          if (textHeight > boxHeight) {
            return "none";
          } else {
            return "block";
          }
        });
    },

    units: function() {
      d3.selectAll(".unit_label")
        .style("display", "block");

      d3.selectAll(".unit_label")
        .style("display", function(d) {
          var textHeight = d3.select("#ul" + d.id).node().getBBox().height,
              textWidth = d3.select("#ul" + d.id).node().getBBox().width,
              boxHeight = parseFloat(d3.select("#u" + d.id).attr("height") - 10),
              boxWidth = parseFloat(d3.select("#u" + d.id).attr("width") - 5);

          if ((textHeight > boxHeight) || (textWidth > boxWidth)) {
            return "none";
          } else {
            return "block";
          }
        });
    }
  },

  graphic: {
    
    position: function() {
      var chunk = window.location.hash.replace("#/", "");

      if (chunk.indexOf("section=") > -1) {
        // We have section
        this.showUnits();
        var section = chunk.replace("section=", "");
        column.sections.forEach(function(d) {
          if (d.id == section) {
            zoom.go(d.interval);
          }
        });
      } else if (chunk.indexOf("column=") > -1) {
        // We have a column
        this.showSections();
      } else {
        // Punt
        this.showUnits();
      }
    },

    swapViews: function() {
      if (column.sections.visible === true) {
        this.showUnits();
      } else {
        this.showSections();
      }
    },

    showSections: function() {
      column.sections.visible = true;
      column.units.visible = false;

      d3.select("#sectionContainer").select("svg").selectAll("g").transition()
        .duration(700)
        .attr("transform", "translate(0,0)");

      d3.select("#sectionContainer")
        .style("z-index", 1);

      d3.select("#stratContainer").select("svg").selectAll("g").transition()
        .duration(700)
        .attr("transform", "translate(1000,0)");

      d3.select("#stratContainer")
        .style("z-index", 0);
    },

    showUnits: function() {
      column.sections.visible = false;
      column.units.visible = true;

      d3.select("#sectionContainer").select("svg").selectAll("g").transition()
        .duration(700)
        .attr("transform", "translate(-1000,0)");
      
      d3.select("#sectionContainer")
        .style("z-index", 0);

      d3.select("#stratContainer").select("svg").selectAll("g").transition()
        .duration(700)
        .attr("transform", "translate(0,0)");
       
      d3.select("#stratContainer")
        .style("z-index", 1);

      adjust.labels.units();
    }
  },

  units: {
    zIndex: function() {
      d3.selectAll(".unit_node").each(function(d) {
        if (d.putOnTop) {
          d3.select(this).moveToFront();
        }

        var y = d3.select(this).attr("y")
        var sameY = d3.selectAll(".unit_node").filter(function(j) {
          if (d3.select(this).attr("y") === y) {
            return this;
          }
        });

        if (sameY[0].length > 1) {
          
          // Do they have the same height?
          var heights = []
          sameY[0].forEach(function(j) {
            heights.push(d3.select(j).attr("height"));
          });

          var uniqHeights = _.uniq(heights);

          if (uniqHeights.length === 1) {

            var first = sameY[0].filter(function(x) {
              if (d3.select(x).attr("x") == 0) {
                return x;
              }
            });

            var nextX = d3.select(first[0]).attr("width");
            
            var rest = sameY[0].filter(function(x) {
              if (d3.select(x).attr("x") != 0) {
                return x;
              }
            });

            rest.forEach(function(p) {
              d3.select(p).attr("x", nextX);
              nextX += d3.select(p).attr("width");
            });
          }

          var minTop = d3.min(sameY[0], function(x) {
            return x.__data__.t_age;
          });
          var maxBottom = d3.max(sameY[0], function(x) {
            return x.__data__.b_age;
          });

          sameY[0].forEach(function(j) {
            if (j.__data__.t_age > minTop) {
              d3.select(j).moveToFront()
            }
            if (j.__data__.b_age < maxBottom) {
              d3.select(j).moveToFront()
            }
          })
        }
      });
    }
  }
}

module.exports.findSectionColumn = findSectionColumn;
module.exports.getStrats = getStrats;



