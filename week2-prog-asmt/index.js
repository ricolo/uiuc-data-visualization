(function () {
    'use strict';

    var xScale = new Plottable.Scales.Time();
    var yScale = new Plottable.Scales.Linear();
    var colorScale = new Plottable.Scales.Color();

    var xAxis = new Plottable.Axes.Time(xScale, "bottom");
    var yAxis = new Plottable.Axes.Numeric(yScale, "left");
    var yLabel = new Plottable.Components.AxisLabel("Temperature Index (.01 Degrees Celsius)", -90);
    var xLabel = new Plottable.Components.AxisLabel("Year");

    var title = new Plottable.Components.TitleLabel("Annual mean Land-Ocean Temperature Index").yAlignment('top');
    var legend = new Plottable.Components.Legend(colorScale).maxEntriesPerRow(3);
    var plots = new Plottable.Components.Group();
    var panZoom = new Plottable.Interactions.PanZoom(xScale, null);
    panZoom.attachTo(plots);

    var table = new Plottable.Components.Table([[null, null, title], [null, null, legend], [yLabel, yAxis, plots], [null, null, xAxis], [null, null, xLabel]]);

    table.renderTo("svg#example");

    d3.csv("./ZonAnn.Ts.csv").get(function (error, data) {
        function getNumber(d) {
            return _.isFinite(+d) ? +d : null;
        }

        var globalKey = 'Glob';
        var northHemKey = 'NHem';
        var southHemKey = 'SHem';
        var regionNameDict = {};
        regionNameDict[globalKey] = 'Global';
        regionNameDict[northHemKey] = 'Northern Hemisphere';
        regionNameDict[southHemKey] = 'Southern Hemisphere';

        var regionTemperatureDict = {};
        var tooltipDict = {};

        _(regionNameDict).forEach(function (regionName, regionKey) {
            // get temperature by region
            regionTemperatureDict[regionKey] = _.map(data, function (row) {
                return {
                    date: new Date(+row['Year'], 0, 1),
                    temperature: getNumber(row[regionKey])
                };
            });

            // define plot
            var linePlot = new Plottable.Plots.Line().addDataset(new Plottable.Dataset(regionTemperatureDict[regionKey]));
            linePlot.x(function (d) {
                return d.date;
            }, xScale).y(function (d) {
                return d.temperature;
            }, yScale).attr("stroke", colorScale.scale(regionName)).attr("stroke-width", 1);

            // without timeout, linePlot.foreground() would return undefined when the component hasn't been anchored
            // http://plottablejs.org/docs/classes/plottable.components.gridlines.html
            setTimeout(function () {
                var tooltipAnchorSelection = linePlot.foreground().append("circle").attr({
                    r: 3,
                    opacity: 0
                });

                var tooltipAnchor = $(tooltipAnchorSelection.node());
                tooltipAnchor.tooltip({
                    animation: false,
                    container: "body",
                    placement: "auto",
                    title: "text",
                    trigger: "manual",
                    content: "<div>formatted data</div>"
                });

                // Setup Interaction Pointer
                var pointer = new Plottable.Interactions.Pointer();
                pointer.onPointerMove(function (p) {
                    var closest = linePlot.entityNearest(p);
                    if (closest) {
                        tooltipDict['p'] = p;
                        // calculate the distance between two points on a cartesian coordinate
                        var distance = getDistance(p.x, p.y, closest.position.x, closest.position.y);
                        tooltipDict[regionKey] = distance;

                        // after finish calculating the distance, determine which region's tooltip to show
                        setTimeout(function () {
                            // match the same pointer location
                            if (tooltipDict['p'].x === p.x && tooltipDict['p'].y === p.y) {
                                var isClosest = true;

                                // if the current region is not closest to the pointer, set the flag to false
                                _(tooltipDict).forEach(function (val, key) {
                                    if (key === 'p' || key === regionKey) {
                                        // do nothing
                                    } else {
                                        if (val < distance) {
                                            isClosest = false;
                                        }
                                    }
                                });

                                // hide the previous tooltip shown (if any)
                                tooltipAnchor.tooltip("hide");

                                // show tooltip at the closest point to pointer
                                if (isClosest) {
                                    tooltipAnchorSelection.attr({
                                        cx: closest.position.x,
                                        cy: closest.position.y,
                                        "data-original-title": "Year: " + closest.datum.date.getFullYear() + ", Temperature: " + closest.datum.temperature + ', Region: ' + regionName
                                    });
                                    tooltipAnchor.tooltip("show");
                                }
                            }
                        }, 10);
                    }
                });

                pointer.onPointerExit(function () {
                    tooltipAnchor.tooltip("hide");
                });

                pointer.attachTo(linePlot);

            }, 10);


            // append each region to plots
            plots.append(linePlot);
        });
    });

    var getDistance = function (x1, y1, x2, y2) {
        return Math.abs(((x2 - x1) ^ 2 + (y2 - y1) ^ 2) ^ 0.5);
    };

    window.addEventListener("resize", function () {
        console.log('resize');
        table.redraw();
    });
})
();