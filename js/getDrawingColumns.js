/* via https://gist.github.com/kjantzer/3974823 */
_.mixin({
  move: function (array, fromIndex, toIndex) {
    array.splice(toIndex, 0, array.splice(fromIndex, 1)[0] );
    return array;
  } 
});

_.mixin({
  moveShallow: function (array, fromIndex, toIndex) {
    var newArray = array.slice(0);
    newArray.splice(toIndex, 0, newArray.splice(fromIndex, 1)[0] );
    return newArray;
  } 
});

function getDrawingColumns(units) {


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
        if (toCheck.indexOf(units_below[i]) < 0 && !topHash[units_below[i]]) {
          toCheck.push(units_below[i]);
        }
      }
    }
    return units_below[0];
  }


  function getUnitAbove(units_above) {
    if (units_above.length > 1) {
      for (var i = 1; i < units_above.length; i++) {
        if (checked.indexOf(units_above[i]) < 0 && !topHash[units_above[i]]) {
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

  // This keeps track of our columns - start with too many and delete unused ones later
  var columns = [{"units": []}, {"units": []}, {"units": []}, {"units": []}, {"units": []}, {"units": []}, {"units": []}];

  // This makes looking up units by ID much easier - no need to loop through and find it
  var unitHash = _.indexBy(units, "id");

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

  // Easily remember which units are tops
  topHash = _.indexBy(tops, "id");

  // For each top, navigate down the section
  tops.forEach(function(d) {
    start(d);
  });

  // By here we'll have our matrix. Remove unused columns.
  columns = columns.filter(function(d) {
    if (d.units.length > 0) {
      return d;
    }
  });

  var checked = [],
      not_found = [];
      
  // Make sure columns are properly sorted...
  units.forEach(function(d) {

    // 1. Find all columns that contain this unit + record them in an array
    var inColumns = findUnitInColumns(d.id, columns);
    // 2. If in more than one column, check if they are consecutive
    if (inColumns.length > 1) {
      // 2A. If they are not consecutive, we need to reorder them
      if (!areColumnsInOrder(inColumns)) {
        console.log("Working on ", d.id)
        /*
        // By here we know we need a fix
        // i. get top and bottom contacts of this unit
        var aboves = d.units_above,
            bottoms = d.units_below;

        // ii. See if at least one top and one bottom are in the target column

        var targetIndex = -1,
            // Array of indices of possible columns
            possibleColumns = [],
            possibleColumnsHash = {};

        // Find all columns that have some combination of the tops and bottoms
        columns.forEach(function(c, i) {
          var topPresent = false,
              topPresentIndex = -1,
              bottomPresent = false,
              bottomPresentIndex = -1;

          aboves.forEach(function(x, k) {
            if (c.units.indexOf(x) > -1) {
              topPresent = true;
              topPresentUnit = x;
            }
          });

          bottoms.forEach(function(x, k) {
            if (c.units.indexOf(x) > -1) {
              bottomPresent = true;
              bottomPresentUnit = x;
            }
          });

          if (topPresent && bottomPresent) {
            if ((c.units.indexOf(bottomPresentUnit) - c.units.indexOf(topPresentUnit)) === 2) {
              possibleColumns.push(i);
              possibleColumnsHash[i] = {
                "above": topPresentUnit,
                "below": bottomPresentUnit
              }
            }
          }
        });

        possibleColumns = _.difference(possibleColumns, inColumns);
*/
      //  if (possibleColumns.length < 1) {

          //console.log("Rearrange columns")
          // Keep yo stack in check

          // Keep sorting until they are in order
         // while (!areColumnsInOrder(inColumns)) {
           // console.log(inColumns)
         // var indices = findGap(inColumns);

         // console.log("moving", d.id)
         /*console.log("from index - ", indices["fromIndex"], inColumns)
          for (var i = 0; i < columns.length; i++) {
            console.log(i)
            newColumnOrder = _.moveShallow(columns, indices["fromIndex"], i);
            // Check if the sort was valid
            if (validSort(checked, newColumnOrder)) {
              console.log("valid sort");
              _.move(columns, indices["fromIndex"], i);
              break;
            } else {
              console.log(checked, newColumnOrder);
              console.log("Not a valid sort!");

              // Try a different sort...
            }
          }*/

          var found = false
          for (var i = 0; i < columns.length; i++) {
            var broken = false;
            for (var j = 0; j < columns.length; j++) {
              newColumnOrder = _.moveShallow(columns, i, j);
              // Check if the sort was valid
              if (validSort(checked, newColumnOrder)) {
                console.log("valid sort");
                _.move(columns, i, j);
                broken = true;
                found = true;
                checked.push(d.id);
                break;
              }
            }

        /* Things seems to work better if we don't bail early with the first valid sort. 
           Last sort seems to work way better for some reason... */

           // if (broken) {
          //    break;
          //  }
          }

          if (!found) {
            console.log("Couldn't find a sort for ", d.id, checked);
            not_found.push(d.id);
          }
          inColumns = findUnitInColumns(d.id, columns);
         // }
     /*   } else {
          var target = possibleColumns[0];

          var unitToMoveIndex = columns[target].units.indexOf(possibleColumnsHash[target].above) + 1,
              unitToMove = columns[target].units[unitToMoveIndex];
              
          // get the val
          console.log(possibleColumns)
          console.log("Swap units in columns", unitToMoveIndex, unitToMove)
        }*/

        // If a top and bottom are both in the target column, see what's between them
        /*if (topPresent && bottomPresent) {
          // If there is only one unit between them...
          if ((colums[targetIndex].indexOf(bottomPresentIndex) - columns[targetIndex].indexOf(topPresentIndex)) === 2) {
            // ...get that unit
            var unitToSwapIndex = colums[targetIndex].indexOf(bottomPresentIndex) - 1,
                unitToSwap = columns[targetIndex][unitToSwapIndex];
            
            // ... And then do the swap
          }
        }*/
          
      }
    } 
    
  });
  
  /* Verify the validity of any given sort, given an array of 
     already verified units and a sort of the "columns" */
  function validSort(us, cs) {
    var broken = false;
    for (var i = 0; i < us.length; i++) {
      // Find all columns the unit is in
      var inColumns = findUnitInColumns(us[i], cs);
      // 2. If in more than one column, check if they are consecutive
      if (inColumns.length > 1) {
        // If they are no longer consecutive, return false;
        if (!areColumnsInOrder(inColumns)) {
          broken = true;
          break;
        }
      }
    }

    if (broken) {
      return false;
    } else {
      return true;
    }

  }


  function findUnitInColumns(unit_id, cs) {
    var inColumns = [];
    cs.forEach(function(j, i) {
      if (_.contains(j.units, unit_id)) {
        inColumns.push(i);
      } 
    });

    return inColumns;
  }


  function areColumnsInOrder(a) {
    var first = _.first(a),
        last = _.last(a);

    if ((last - first) === (a.length - 1)) {
      return true;
    } else {
      return false;
    }
  }


  function findGap(a) {
    for (var i = 0; i < a.length; i++) {
      if ((a[i + 1] - a[i]) > 1) {
        // {fromIndex: toIndex}
        return { "fromIndex" : a[i + 1],
                 "toIndex"   : a[i] + 1 
               }
      }
    }
  }

  // Debugging...
  //var notChecked = getUnChecked();
  //console.log("Checked - ", checked);
  //console.log("Not checked - ", notChecked);

  inside.forEach(function(d) { 
    d = JSON.parse(d); 
    console.log(d.id + " is inside " + d.isInside)
  });

  // This helps us display units that are inside other units or lay on top awkwardly
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
