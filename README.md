# Column/section/unit renderer
Given a macrostrat column, produce a reasonable representation

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
