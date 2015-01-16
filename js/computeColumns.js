var _ = require("underscore");

module.exports = function (units) {


  function addToColumn(column_index, unit_id) {
    checked.push(unit_id);
    columns[column_index].units.push(unit_id);
  }


  function addToColumnAbove(column_index, unit_id) {
    checked.push(unit_id);
    columns[column_index].units.unshift(unit_id);
  }


  function getUnitBelow(units_below) {
    if (units_below.length > 1) {
      for (var i = 1; i < units_below.length; i++) {
        if (toCheck.indexOf(units_below[i]) < 0) {
          toCheck.push(units_below[i]);
        }
      }
    }
    return units_below[0];
  }


  function getUnitAbove(units_above) {
    if (units_above.length > 1) {
      for (var i = 1; i < units_above.length; i++) {
        if (checked.indexOf(units_above[i]) < 0) {
          toCheck.push(units_above[i]);
        }
        
      }
    }
    return units_above[0];
  }


  function goDownColumn(unit_id) {
    var firstBelow = getUnitBelow(unitHash[unit_id].units_below);
    while (firstBelow > 0) {
      addToColumn(nextColumn, firstBelow);
      firstBelow = getUnitBelow(unitHash[firstBelow].units_below)
    }
    nextColumn++;
  }


  function goUpColumn(unit_id) {
    var firstAbove = getUnitAbove(unitHash[unit_id].units_above);
    while (firstAbove > 0) {
      addToColumnAbove(nextColumn, firstAbove);
      firstAbove = getUnitAbove(unitHash[firstAbove].units_above)
    }
    goDownColumn(unit_id);
  }


  function getUnChecked() {
    var notChecked = []
    units.forEach(function(d) {
      if (checked.indexOf(d.id) < 0) {
        notChecked.push(d.id);
      }
    });

    return notChecked;
  }


  function start(unit) {
    toCheck = [];
    // Add the top unit to a columns
    addToColumn(nextColumn, unit.id);

    goDownColumn(unit.id)

    for (var i = 0; i < toCheck.length; i++) {
      addToColumn(nextColumn, toCheck[i]);
      goUpColumn(toCheck[i]);
    }

  }

  // This keeps track of our columns - start with 
  var columns = [{"units": []}, {"units": []}, {"units": []}, {"units": []}, {"units": []}, {"units": []}, {"units": []}];

  // This makes looking up units by ID much easier - no need to loop through and find it
  var unitHash = {};
  units.forEach(function(d) {
    unitHash[d.id] = d;
  });

  /* First we are going to find units that are ENTIRELY inside other units */

  // We'll keep track of the index of these in `toRemove`, and the actual unit in `inside`
  var toRemove = [],
      inside = [];

  // Check each unit
  for (var i = 0; i < units.length; i++) {
    /* If a unit's `units_above` and `units_below` share a value (intersection), we 
       either found a unit that is inside another unit, or a unit that has a unit inside of it */
    var intersection = _.intersection(units[i].units_above, units[i].units_below);

    if (intersection.length > 0 && intersection[0] !== 0) {
      // If this is the case, remove all units that occur in both `units_above` and `units_below`
      units[i].units_above = _.difference(units[i].units_above, intersection);
      units[i].units_below = _.difference(units[i].units_below, intersection);
      /* If units above and below are still > 0 in length, all units in the intersection should be removed
         and it also indicates that this is a unit that has a unit entirely inside of it */
      if (units[i].units_above.length > 0 && units[i].units_below.length > 0) {
        intersection.forEach(function(d, i) {
          toRemove.push(d);
          inside.push(unitHash[d]);
        });
      // Otherwise we have a unit that's inside of another unit. Record which unit it is inside of
      } else {
        units[i].isInside = intersection[0]
        toRemove.push(units[i].id);
        inside.push(units[i]);
      }
    }
  }

  // Remove units that are inside others
  units = units.filter(function(d) {
    if (toRemove.indexOf(d.id) < 0) {
      return d;
    }
  });

  // Find unique inside units
  inside = _.uniq(_.collect(inside, function(x) {
    return JSON.stringify(x);
  }));

  // Alright, now that inside units are taken care of, we can move on...

  /* `checked` keeps track of all units that have been accounted for,
     `toCheck` keeps track of units that we come across that we need to revisit
     `nextColumn` is the index of the current object in `columns` being filled */
  var checked = [],
      toCheck = [],
      nextColumn = 0;

  // Find all units that are at the top of the section, i.e. `units_above` = [0]
  var tops = units.filter(function(d) {
    if (d.units_above.length === 1 && d.units_above.indexOf(0) > -1) {
      return d;
    }
  });

  // For each top, navigate down the section
  tops.forEach(function(d) {
    start(d);
  });

  // Remove unused columns
  columns = columns.filter(function(d) {
    if (d.units.length > 0) {
      return d;
    }
  });

  // Debugging...
  //var notChecked = getUnChecked();
  //console.log("Checked - ", checked);
  //console.log("Not checked - ", notChecked);

  inside.forEach(function(d) { 
    d = JSON.parse(d); 
    console.log(d.id + " is inside " + d.isInside)
  });

  units.forEach(function(d) {
    var top = d.t_age,
        bot = d.b_age;

    if (d.units_above.length < 2 && d.units_below.length < 2) {
      var above = d.units_above[0],
          below = d.units_below[0];

      if (above !== 0) {
        if (top > unitHash[above].t_age && top < unitHash[above].b_age) {
          // within
          d.putOnTop = true;
        }

        if (bot > unitHash[above].t_age && bot < unitHash[above].b_age) {
          // within
          d.putOnTop = true;
        }

        if (top === unitHash[above].t_age && bot < unitHash[above].b_age ) {
          d.within = true;
          d.withinUnit = above;
          unitHash[above].containsUnit = d.id;
        }

        if (bot === unitHash[above].b_age && top > unitHash[above].t_age) {
          d.within = true;
          d.withinUnit = above;
          unitHash[above].containsUnit = d.id;
        }
      }

      if (below !== 0) {
        if (top > unitHash[below].t_age && top < unitHash[below].b_age) {
          // within
          d.putOnTop = true;
        }

        if (bot > unitHash[below].t_age && bot < unitHash[below].b_age) {
          // within
          d.putOnTop = true;
        }

        if (top === unitHash[below].t_age && bot < unitHash[below].b_age ) {
          d.within = true;
          d.withinUnit = below;
          unitHash[below].containsUnit = d.id;
        }

        if (bot === unitHash[below].b_age && top > unitHash[below].t_age) {
          d.within = true;
          d.withinUnit = below;
          unitHash[below].containsUnit = d.id;
        }
      }

    }
      
  });

  // Fire back the result
  return {
    "columns": columns,
    "units": units,
    "inside": inside,
    "unitHash": unitHash
  }

}

