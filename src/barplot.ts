// @ts-expect-error
import d3 = require("d3");
import { AxisImage } from "./AxisImage.js";

import { DataPoint } from "./data.js";
import { Margin } from "./Margin.js";
import { Svg } from "./Svg.js";
import { Tooltip } from "./Tooltip.js";
import { assert, assertType } from "./utils.js";

const scl = 15;
const colourBottom = "rgb(56, 94, 231)";
const colourTop = "rgb(34, 236, 87)";

 /**
   * \brief   Averages the city data.
   * @param   cityData : The array of DataPoint describing the city.
   * @returns Returns the average of the city's DataPoint values.
   */
function avgCityData(cityData: DataPoint[]) : number {
  let sum = 0.0;
  let numElements = 0;
  cityData.forEach((d) => addDataPointElement(d.value));
  function addDataPointElement(dataPointValue: string) {
    sum +=  parseFloat(dataPointValue);
    ++numElements;
  }
  let avg = sum / numElements;
  return avg;
}

export class Barplot {
  parentId: string;
  canvas: any;
  id: number;
  min: number[];
  max: number[];
  margin: Margin;
  width: number;
  height: number;
  readonly widthFactor: number;
  svg: Svg;
  tooltip: Tooltip;
  dataArray: DataPoint[];
  private _isLeadLag: boolean;

  constructor(
    parentId,
    width,
    height,
    {
      margin = new Margin(10, 10, 10, 10),
      widthFactor = 0.05,
      isLeadLag = false,
    } = {}
  ) {
    this.parentId = parentId;
    this.margin = margin;
    this.widthFactor = widthFactor;
    this._isLeadLag = isLeadLag;
    this.width = width;
    this.height = height - this.margin.top - this.margin.bottom;

    this.svg = new Svg(this.parentId);

    this.canvas = this.svg.svg
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Define the div for the tooltip
    this.tooltip = new Tooltip();
  }

  public get isLeadLag(): boolean {
    return this._isLeadLag;
  }
  public set isLeadLag(v: boolean) {
    this._isLeadLag = v;
    this.toggleLeadLag();
  }

  getColour() {
    let max = Number(
      d3.max(this.dataArray, (d: DataPoint) => {
        return d.value;
      })
    );
    return (
      d3
        .scaleLinear()
        .domain([0, max])
        // @ts-ignore
        .range([colourBottom, colourTop])
    );
  }

  getWidthScale() {
    return d3
      .scaleLinear()
      .domain([0, Math.max(...this.max)])
      .range([0, this.width - this.margin.left - this.margin.right]);
  }

  getHeightScale() {
    return d3
      .scaleBand()
      .range([this.height, 0])
      .padding(0.1)
      .domain(
        this.dataArray.map(function (d) {
          return d.name;
        })
      );
  }

  /* @getAttr(d3object, oject)
    - constructor for reused attributes for barplot. All updates to common
      atrributes are stored in this single function for rapid updating
    - the attributes object should be an array of strings that match d3
      attributes
  */
  getAttr(path, obj, attributes) {
    var widthScale = obj.getWidthScale();
    var heightScale = obj.getHeightScale();
    var colour = obj.getColour();

    for (let key in attributes) {
      switch (attributes[key]) {
        case "width":
          path.attr("width", function (d) {
            return widthScale(d.value);
          });
          break;
        case "height":
          path.attr("height", heightScale.bandwidth());
          break;
        case "fill":
          path.attr("fill", function (d) {
            return colour(d.value);
          });
          break;
        case "fillTransparent":
          path.attr("fill", function (d) {
            const rtn = colour(d.value);
            return setAlpha(rtn, 0);
          });
          break;
        case "y":
          path.attr("y", function (d) {
            return heightScale(d.name);
          });
          break;
        case "cx":
          path.attr("cx", function (d) {
            return widthScale(d.value);
          });
          break;
        case "cy":
          path.attr("cy", function (d) {
            return heightScale(d.name);
          });
          break;
        case "r":
          path.attr("r", heightScale.bandwidth() / 2);
          break;
      }
    }
  }

  getXAxis(path, obj) {
    path
      .attr("transform", "translate(0," + obj.height + ")")
      .call(d3.axisBottom(obj.getWidthScale()));
  }

  getYAxis(path, obj: Barplot): void {
    path.call(d3.axisLeft(obj.getHeightScale()));
    AxisImage.update(obj);
  }

  /** Fired when this.isLeadLag is changed
   * switches leadLag opacity on or off
   * changes rect size to match min and max of the variable it's measuring
   */
  toggleLeadLag() {
    var widthScale = this.getWidthScale();

    if (this.isLeadLag) {
      var colour = this.getColour();

      // turn leadLag marker visible
      this.canvas.selectAll("rect.leadLag").each(function (d, i) {
        d3.select(this).call(attrTween, 800, "fill", colour(d.value));
        d3.select(this).call(attrTween, 800, "stroke", "white");
      });

      this.canvas
        .selectAll("rect.bar")
        .transition()
        .duration(800)
        .attr("transform", function () {
          let rtn = Number(d3.select(this).attr("min"));
          rtn = widthScale(rtn);
          return "translate(" + rtn + ", 0)";
        })
        .attr("width", function () {
          let rtn = Number(d3.select(this).attr("max"));
          rtn -= Number(d3.select(this).attr("min"));
          return widthScale(rtn);
        })
        .attr("fill", function () {
          let rtn = Number(d3.select(this).attr("min"));
          rtn += Number(d3.select(this).attr("max"));
          rtn /= 2;
          rtn = colour(rtn);
          rtn = setAlpha(rtn, 0.5);
          return rtn;
        })
        .attr("stroke", "black");
    } else {
      // turn leadLag marker invisible
      this.canvas.selectAll("rect.leadLag").each(function () {
        var myCol = d3.select(this).attr("fill");
        d3.select(this).call(attrTween, 800, "fill", setAlpha(myCol, 0));
        d3.select(this).call(attrTween, 800, "stroke", "rgba(0,0,0,0)");
      });

      this.canvas
        .selectAll("rect.bar")
        .transition()
        .duration(800)
        .each(function (d) {
          var myCol = d3.select(this).attr("fill");
          d3.select(this).call(attrTween, 800, "fill", setAlpha(myCol, 1));
          d3.select(this).call(attrTween, 800, "width", widthScale(d.value));
        })
        .attr("transform", "translate(0, 0)")
        .attr("stroke", "rgba(0,0,0,0)");
    }
  }

 

  /** Ran once on screen load, instantiates every d3 elem in second panel
   */
  plot(dataArray: DataPoint[], min: number[], max: number[]): void {
    this.min = min;
    this.max = max;
    this.dataArray = dataArray;
    var widthScale = this.getWidthScale();

    this.canvas
      .selectAll("rect.bar")
      .data(this.dataArray)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("name", function (d) {
        return d.name;
      })
      .attr("min", function (d, i) {
        return min[i];
      })
      .attr("max", function (d, i) {
        return max[i];
      })
      .attr("width", function (d) {
        return widthScale(0);
      })
      .call(this.getAttr, this, ["height", "fill", "y"])
      .attr("stroke", "rgba(0,0,0,0)")
      .style("cursor", "pointer")
      // .on("click", this.onClick)
      .on("mouseover", (d, i) => {
        this.onMouseover(d, i);
      })
      .on("mouseout", () => {
        this.onMouseOut();
      })
      .on("mousemove", () => {
        this.onMouseMove();
      });

    let width = this.width;
    // add markers for leadLag plot
    this.canvas
      .selectAll("rect.leadLag")
      .data(dataArray)
      .enter()
      .append("rect")
      .attr("class", "leadLag")
      .attr("widthFactor", this.widthFactor)
      //invisible until first marker is selected
      .call(this.getAttr, this, ["x", "y", "height", "fillTransparent"])
      .attr("width", () => {
        return width * this.widthFactor;
      })
      .attr("stroke", "rgba(0,0,0,0)")
      .attr("pointer-events", "none");

    let avg = widthScale(avgCityData(dataArray));

    // add the horizontal average line
    this.canvas.append('line')
      .attr('x1', avg)
      .attr('y1', 0)
      .attr('x2', avg)
      .attr('y2', this.height)
      .attr('stroke', 'red');

    // add the x Axis
    this.canvas.append("g").attr("class", "x axis").call(this.getXAxis, this);

    // add the y Axis
    this.canvas.append("g").attr("class", "y axis").call(this.getYAxis, this);
  }

  /** Excplicitely cast `this` into a d3.BaseType
   * because d3 often co-opts the `this` keyword */
  get baseType() {
    return this as unknown as d3.BaseType;
  }

  onClick(data) {
    // change marker size based on data value
    var radiusScale = d3
      .scaleLinear()
      .domain([
        0,
        Number(
          d3.max(this.dataArray, function (d: DataPoint) {
            return d.value;
          })
        ),
      ])
      .range([scl / 2, scl * 2]);

    if (this.isLeadLag === false) {
      var myCol = d3.select(this.baseType).attr("fill");

      d3.select(this.baseType).call(
        resetTween,
        100,
        "fill",
        setAlpha(myCol, 1),
        setAlpha(myCol, 0.4)
      );
    }
  }

  onMouseover(data: DataPoint, index: number) {
    assertType(this, Barplot);
    const initialText = data.description;
    this.tooltip.text = initialText;
    this.tooltip.fadeIn();

    const newText = `${initialText} ${data.value}`;
    this.tooltip.setTextAfterDelay(newText);

    this.tooltip.repositionTooltipIfOffscreen(this.svg.bottom);

    this.flashRect(index);
  }

  /**
   * Highlight barplot rectangle if NOT in leadLag mode
   * @param index The index value of the barplot rectangle being modified
   */
  flashRect(index: number): void {
    if (this.isLeadLag) return;

    let currectRect = this.getRectByIndex(index);
    let myCol = currectRect.attr("fill");

    currectRect.call(
      resetTween,
      100,
      "fill",
      setAlpha(myCol, 1),
      setAlpha(myCol, 0.7)
    );
  }

  getRectByIndex(index: number): d3.Selection<any, any, any, any> {
    return d3.select(this.canvas.selectAll("rect.bar")._groups[0][index]);
  }

  onMouseMove() {
    assertType(this, Barplot);
    // @ts-ignore
    const x = d3.event.pageX + 10;
    // @ts-ignore
    const y = d3.event.pageY;
    this.tooltip.setPosition({ x: x, y: y });

    this.tooltip.repositionTooltipIfOffscreen(this.svg.bottom);
  }

  onMouseOut() {
    assertType(this, Barplot);
    this.tooltip.fadeOut();
  }

  /* @updatePlot(svg, data)
  - run on marker click, resizes rectangle/circle attributes according to data
*/
  updatePlot(dataArray: DataPoint[]) {
    this.dataArray = dataArray;
    var widthScale = this.getWidthScale();
    var colour = this.getColour();

    if (this.isLeadLag === false) {
      this.canvas
        .selectAll("rect.bar")
        .data(this.dataArray)
        .each(function (d, i) {
          d3.select(this).call(attrTween, 800, "width", widthScale(d.value));
          d3.select(this).call(attrTween, 800, "fill", colour(d.value));
        });
    }

    this.canvas
      .selectAll("rect.leadLag")
      .data(this.dataArray)
      .each(function (d, i) {
        var widthFactor = Number(d3.select(this).attr("widthFactor"));
        var xPos = widthScale(d.value) * (1 - widthFactor);
        d3.select(this).call(attrTween, 800, "x", xPos);
        if (this.isLeadLag) {
          d3.select(this).call(attrTween, 800, "fill", colour(d.value));
        }
      });

    let avg = widthScale(avgCityData(dataArray));
    let newAvgLine = [{x: avg, y: 0}, {x: avg, y: this.height}];
    let newX = [avg, avg];
    let newY = [0, this.height];

    var u = this.canvas.select("line")
      .data(newAvgLine);

    var x = d3.scaleLinear().range([0,width]);
    x.domain([0, d3.max(data, function(d) { return d.ser1 }) ]);

    this.canvas.select('line').enter()
      .transition()
      .duration(3000)
      .attr("d", d3.line()
        .x(function(d) { return x(d.x); })
        .y(function(d) { return y(d.y); }))
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2.5);

    // add the horizontal average line
    // this.canvas.append('line')
    //   .attr('x1', avg)
    //   .attr('y1', 0)
    //   .attr('x2', avg)
    //   .attr('y2', this.height)
    //   .attr('stroke', 'red');
  }

  resize() {
    this.width = Number(
      d3.select(this.parentId).style("width").replace("px", "")
    );
    // this.width = ($(window).width()*panelWidth);
    this.height =
      $(window).height() - 50 - this.margin.top - this.margin.bottom;

    var widthScale = this.getWidthScale();

    // update .rect width based on if leadLag mode is toggled
    if (this.isLeadLag) {
      this.canvas
        .selectAll("rect.bar")
        .attr("width", function () {
          var rtn = Number(d3.select(this).attr("max"));
          rtn -= Number(d3.select(this).attr("min"));
          return widthScale(rtn);
        })
        .attr("transform", function () {
          let rtn = Number(d3.select(this).attr("min"));
          rtn = widthScale(rtn);
          return "translate(" + rtn + ", 0)";
        });
    } else {
      this.canvas.selectAll("rect.bar").call(this.getAttr, this, ["width"]);
    }

    // update .rect height (same regardless of leadLag toggle)
    this.canvas.selectAll("rect.bar").call(this.getAttr, this, ["height", "y"]);

    this.canvas
      .selectAll("rect.leadLag")
      .call(this.getAttr, this, ["y", "height"])
      .attr("width", () => {
        return this.width * this.widthFactor;
      })
      .attr("x", (d) => {
        return widthScale(d.value) * (1 - this.widthFactor);
      });

    this.canvas.selectAll("g.x.axis").call(this.getXAxis, this);

    this.canvas.selectAll("g.y.axis").call(this.getYAxis, this);

    this.svg.resize();

    this.tooltip.repositionTooltipIfOffscreen(this.svg.bottom);
  }

  applyStrokeByName(nameToSelect: string) {
    this.canvas
      .selectAll("rect.bar")
      .each(function(d, i) {
        // Turn off stroke from previous selection
        d3.select(this).call(attrTween, 800, "stroke", "rgba(0,0,0,0)");
        let currentName = d3.select(this).attr("name")
        if (currentName === nameToSelect) {
          // Turn on stroke to new selection
          d3.select(this).call(attrTween, 800, "stroke", "black");
        }
      })
  }
}

export function setAlpha(c, v) {
  c = d3.rgb(c);
  c.opacity = v;

  return c;
}

export function attrTween(path, duration, attr, endRes) {
  var dummy = {} as unknown as d3.BaseType;
  // var colour = this.getColour();
  d3.select(dummy)
    .transition()
    .duration(duration)
    .tween(attr, function () {
      if (path.empty()) return;
      var lerp = d3.interpolate(path.attr(attr), endRes);
      return function (t) {
        path.attr(attr, lerp(t));
      };
    });
}

function resetTween(path, duration, attr, endRes, peakRes) {
  var dummy = {} as unknown as d3.BaseType;
  // var colour = this.getColour();

  d3.select(dummy)
    .transition()
    .duration(duration)
    .tween(attr, function () {
      var lerp = d3.interpolate(path.attr(attr), peakRes);
      return function (t) {
        path.attr(attr, lerp(t));
      };
    })
    .transition()
    .duration(duration * 3)
    .tween(attr, function () {
      var lerp = d3.interpolate(peakRes, endRes);
      return function (t) {
        path.attr(attr, lerp(t));
      };
    });
}
