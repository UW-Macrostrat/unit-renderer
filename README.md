# Column/section/unit renderer
Given a macrostrat column, produce a reasonable representation


## Dependencies
+ [d3.js](http://d3js.org/)
+ [underscore.js](http://underscorejs.org/)



## API
The renderer is globally namespaced to ````cr```` by default.

### .init(div ID, [callback])
Initializes the renderer into the given ````<div>````, with an optional ````callback```` supplied, which can be used to attach UI-specific handlers (such as click and mouseover actions on the units).

### .goToColumn(col_id)
Loads a given column

### .goToSection(section_id)
Load the column of a given section and zoom to that section

### .column{}
An object that contains information about the data being rendered. Useful for debugging purposes. Contains 

+ ````intervals````, and array of time intervals returned from the API
+  ````sections````, an array of sections returned from the API
+  ````units````, the units returned for the given column
+  ````sectionLookup````, a hash that contains the "column" matrix for each section.


### General function flow
````
init
  (findSectionColumn)
  getStrats
    getColumnUnits
    getColumnSections
      getTimescaleData
        drawTimescale
          adjust.labels.timescale
        setupUnits
          drawStrats
            getDrawingColumns
              [
                start
                  addToColumn
                  goDownColumn
                    getUnitBelow
                    (addToColumn
                    getUnitBelow)
                  addToColumn
                  goUpColumn
                    getUnitAbove
                    (addToColumnAbove
                    getUnitAbove)
                    goDownColumn
                      getUnitBelow
                      (addToColumn
                      getUnitBelow)
              ]
            adjust.labels.units
            adjust.units.zIndex
        drawSections
          adjust.graphic.position
            showSections
          adjust.labels.sections

zoom
  go
    inn.go
      inn.timescale
        adjust.labels.timescale
      inn.sections
        adjust.labels.sections
      inn.units
        adjust.labels.units
    out.go
      out.timescale
        adjust.labels.timescale
      out.sections
        adjust.labels.sections
      out.units
        adjust.labels.units
````


### A note on ````getDrawingColumns.js````
The meat of this script is more-or-less a path finding algorithm that creates a matrix which can then be used to help us draw columns. For example, the result for [section 103](http://macrostrat.org/api/units?section_id=103&response=long) would be

````
732
734
735
````

whereas the result for [section 4258](http://macrostrat.org/api/units?section_id=4258&response=long) would be

````
16138       16137
16139       16140
16141       16143
16144
16142
16143
````
        
We can then use this matrix to draw conclusions about ````x```` positioning and ````width````. For example, unit ````16143```` appears in both columns, and thus gets the full width available, and its first occurrence is in the first "column", so it gets an ````x```` of ````0````, whereas unit ````16137```` appears in only one of two "columns", and thus gets half of the available width. Its first appearance is in "column" one, so it will be offset from "column" zero.




