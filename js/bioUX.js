var $ = window.jQuery;
var d = $(document.body);

function checkHost(name) {
    return location.host.indexOf(name) > -1;
}

function checkLocation(str) {
    return location.href.indexOf(str) > -1;
}

var isNCBI = checkHost("ncbi.nlm.nih.gov");
var isNMPDR = checkHost("rast.nmpdr.org");


// NCBI rules
if (isNCBI) {
    // NCBI: Hide empty search result categories
    if (checkLocation("/search/?term=")) {
        d.find(".gq-db-count-404").parents("tr.gq-db").remove();
    }

    // NCBI: add select all button to NCBI SERPs
    if (d.find('[sourcecontent="send_to_menu"]').length > 0 ) {
        var clickAllCheckboxes = function(e) {
            var arrCheckboxes = $(e.target).parents(".content:first")
                .find("#messagearea").next()
                .find("input[type=checkbox]:visible");

            arrCheckboxes.click();

            var b = $(e.target);

            if (b.text() == "select all") {
                b.text("deselect all");
            } else {
                b.text("select all");
            }
            // console.log("arrCheckboxes", arrCheckboxes);

            return false;
        }

        var selectAllButton = $("<button type='button'>select all</button>").click(clickAllCheckboxes);
        d.find(".title_and_pager h2").append(selectAllButton);
    }
}

// NMPDR rules
if (isNMPDR) {
    // add visualization to seedviewer
    if (checkLocation("/seedviewer.cgi")) {
        function rgbToHex(r, g, b) {
            if (r > 255 || g > 255 || b > 255)
                throw "Invalid color component";
            return ((r << 16) | (g << 8) | b).toString(16);
        }

        function getCanvasImageColor (imageElem) {
            var c = document.createElement("canvas");
            var ctx = c.getContext("2d");
            ctx.drawImage(imageElem, 0, 0);
            var p = ctx.getImageData(1, 1, 1, 1).data; 
            var hex = "#" + ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6);

            return hex;
        }
        
        var insertAfterElem = d.find("h2:contains(Subsystem Information)").next().next();

        if (insertAfterElem.length > 0) {
            var arrBoxes = $("#tree_0").find("div[name] img[src^='data:']");
            var regExpDataLabels = /^(.*) \(([0-9]+)\)$/;
            var data = new Map();

            for (var i = 0; i < arrBoxes.length; i++) {
                var text = arrBoxes[i].nextSibling.nodeValue;
                text = (text +"").trim();

                var arrMatches = text.match(regExpDataLabels);

                console.log("text", text, "matches", arrMatches);

                if (arrMatches.length !== 3) {
                    console.error("could not get match from", text, "arrMatches",arrMatches);
                }

                data.set(arrMatches[1], {
                    count: parseInt(arrMatches[2], 10), 
                    color: getCanvasImageColor(arrBoxes[i])
                });
            }
            
            var arrFilteredEntries = Array.from(data.entries())
                .filter((arr) => arr[1].count > 0);
            var arrKeys = arrFilteredEntries
                .sort((arr1, arr2) => d3.descending(arr1[1].count, arr2[1].count))
                .map((arr) => arr[0]);
            var arrValues = arrFilteredEntries.map((arr) => arr[1]);
            
            var margin = {
                top: 50, 
                right: 0, 
                bottom: 30, 
                left: 50
            };
                
            var numFormat = d3.format(",");

            var bodyWidth = d.innerWidth();
            
            var LABEL_FONT_SIZE = 14;
            var PADDING_BEFORE_BAR = 5;
            var PADDING_AFTER_ITEM = 3;
            var BAR_HEIGHT = 3;
            
            var HEIGHT_PER_ITEM = LABEL_FONT_SIZE + PADDING_BEFORE_BAR + BAR_HEIGHT + PADDING_AFTER_ITEM;
            var BAR_CHART_AREA_HEIGHT = arrKeys.length * HEIGHT_PER_ITEM ;

            var BAR_CHART_AREA_WIDTH = 700;

            if (bodyWidth < BAR_CHART_AREA_WIDTH + margin.left) {
                BAR_CHART_AREA_WIDTH = bodyWidth - margin.left;
            }
            
            var svgHeight = BAR_CHART_AREA_HEIGHT + margin.bottom + margin.top;
            var $svg = $(`<svg width=${bodyWidth} height=${svgHeight} />`).css({
                width: bodyWidth + "px", 
                height: svgHeight + "px",
                display: "block"
            });
            insertAfterElem.before($svg);

            var svg = d3.select($svg[0])
                .style("border", "1px solid #5da668")
                .style("margin-bottom", "10px")
                .style("margin-top", "10px")
                .style("padding-top", "20px");
            
            // append pattern from https://iros.github.io/patternfills/sample_d3.html
            $svg.append('<defs> <pattern id="whitecarbon" patternUnits="userSpaceOnUse" width="6" height="6"> <image xlink:href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHhtbG5zOnhsaW5rPSdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJyB3aWR0aD0nNicgaGVpZ2h0PSc2Jz4KICA8cmVjdCB3aWR0aD0nNicgaGVpZ2h0PSc2JyBmaWxsPScjZWVlZWVlJy8+CiAgPGcgaWQ9J2MnPgogICAgPHJlY3Qgd2lkdGg9JzMnIGhlaWdodD0nMycgZmlsbD0nI2U2ZTZlNicvPgogICAgPHJlY3QgeT0nMScgd2lkdGg9JzMnIGhlaWdodD0nMicgZmlsbD0nI2Q4ZDhkOCcvPgogIDwvZz4KICA8dXNlIHhsaW5rOmhyZWY9JyNjJyB4PSczJyB5PSczJy8+Cjwvc3ZnPg==" x="0" y="0" width="6" height="6"> </image> </pattern> </defs>');

            var y = d3.scaleBand()
                .range([0, BAR_CHART_AREA_HEIGHT])
                .padding(0);
            var x = d3.scaleLinear().rangeRound([0, BAR_CHART_AREA_WIDTH]);

            var g = svg.append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            y.domain(arrKeys);
            x.domain([0, d3.max(arrValues, (d) => d.count)])
            // .nice();

            var xAxis = g.append("g")
              .attr("class", "axis axis--x")
              .attr("transform", "translate(0," + (BAR_CHART_AREA_HEIGHT - LABEL_FONT_SIZE)  + ")")
              .call(d3.axisBottom(x).ticks());
              
            xAxis.selectAll("text")
              .style("font-size", LABEL_FONT_SIZE)
              .style("font-family", "verdana, sans-serif")
              .attr("fill", "#444");
            xAxis.selectAll("line,path").attr("stroke", "#777")
            
            var HEADING_FONT_SIZE = LABEL_FONT_SIZE + 2;
            var svgHeading = svg.append("text")
              .text("Subsystem Category Distribution")
              .style("font-size", HEADING_FONT_SIZE)
              .style("font-weight", "bold")
              .attr("dy", LABEL_FONT_SIZE)
              .attr("dx", margin.left)
            
            var sumSubSystemCategories = d3.sum(arrValues, (d) => d.count);
            var svgSubHeading = svg.append("text")
              .text("∑="+numFormat(sumSubSystemCategories))
              .style("font-size", HEADING_FONT_SIZE)
              .attr("fill", "#555")
              .attr("dy", LABEL_FONT_SIZE)
              .attr("dx", margin.left + svgHeading.node().getBBox().width + 10)

            var yAxis = g.append("g")
              .attr("class", "axis axis--y")
              .call(d3.axisLeft(y).ticks(10));

            // yAxis.selectAll("text")
            //   .attr("text-anchor", "start")
            //   .attr("x", 5)
            //   .style("font-size", LABEL_FONT_SIZE)
            //   .attr("dy", 0);

            yAxis.selectAll("*")
                .remove();
            
            var BACKGROUND_COLOR = d3.rgb("#fff");

            function luminance(r, g, b) {
                var a = [r, g, b].map(function (v) {
                    v /= 255;
                    return v <= 0.03928
                        ? v / 12.92
                        : Math.pow( (v + 0.055) / 1.055, 2.4 );
                });
                return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
            }

            function getContrast(rgb1, rgb2) {
                return (luminance(rgb1.r, rgb1.g, rgb1.b) + 0.05) / (luminance(rgb2.r, rgb2.g, rgb2.b) + 0.05);
            }

            var CONTRAST_THRESHOLD = 0.7;

            function getBarColor(hexColor) {
                var c = d3.rgb(hexColor);
                // console.log("getBarColor", hexColor,"c", c);

                var contrast = getContrast(c, BACKGROUND_COLOR);
                // console.log("contrast", contrast);
                while (contrast > CONTRAST_THRESHOLD) {
                    // console.log("contrast", contrast, "darken!");

                    c = c.darker();
                    contrast = getContrast(c, BACKGROUND_COLOR);
                }

                return "" + c;
            }

            var enterSelection = g.selectAll(".bar")
                .data(arrFilteredEntries)
                .enter().append("g")

            var getBarLabelID = (id) => "bar-label" + id;

            enterSelection.append("text")
              .text((arr) => arr[0].replace("and", "&"))
              .attr("id", (d,i) => getBarLabelID(i))
              .attr("dx", BAR_HEIGHT * 2)
              .attr("text-anchor", "start")
              .style("font-size", LABEL_FONT_SIZE)
              .attr("x", (arr) => x(0) + 1)
              .attr("y", (arr) => y(arr[0]));
            
            enterSelection.append("text")
              .text((arr) => numFormat(arr[1].count))
              .attr("dx", -2 * BAR_HEIGHT)
              .attr("text-anchor", "end")
              .style("font-size", LABEL_FONT_SIZE)
              .attr("x", (arr) => x(0) + 1)
              .attr("y", (arr) => y(arr[0]));
            
            var d3PercentageFormat = d3.format(".1%");
            function percentageFormat(percent) {
                var strLabel = d3PercentageFormat(percent);

                if (strLabel[0] === "0") {
                    strLabel = strLabel.substr(1);
                }

                return strLabel;
            }

            enterSelection.append("text")
              .text((arr) => percentageFormat(arr[1].count / sumSubSystemCategories))
              // .attr("dx", BAR_HEIGHT * 2)
              .attr("text-anchor", "end")
              .attr("fill", (arr) => getBarColor(arr[1].color))
              .style("font-size", LABEL_FONT_SIZE)
              .attr("x", function (arr, i) {
                    // var label = d3.select($svg.find("#"+getBarLabelID(i))[0]);
                    // var xPos = x(arr[1].count);
                    // var labelWidth = label.node().getBBox().width;
                    // console.log("arr[0]", arr[0], "xPos", xPos, "labelWidth", labelWidth);
                    // if (labelWidth >  xPos + 40) {
                        xPos = BAR_CHART_AREA_WIDTH;
                        // this.attr("text-anchor", "start");
                    // }

                    return xPos
                })
              .attr("y", (arr) => y(arr[0]));
                

            enterSelection.append("rect")
              .attr("fill", (arr) => getBarColor(arr[1].color))
              .attr("x", (arr) => x(0) + 1)
              .attr("y", (arr) => y(arr[0]) - LABEL_FONT_SIZE)
              .attr("width", BAR_HEIGHT)
              .attr("height", LABEL_FONT_SIZE + PADDING_BEFORE_BAR);

            enterSelection.append("rect")
              .attr("class", "bar")
              .attr("fill", (arr) => getBarColor(arr[1].color))
              .attr("x", (arr) => x(0) + 1)
              .attr("y", (arr) => y(arr[0]) + PADDING_BEFORE_BAR)
              .attr("width", (arr) =>  x(arr[1].count) - x(0))
              .attr("height", BAR_HEIGHT);

            var pieWidth = BAR_CHART_AREA_WIDTH * 0.5;
            var pieHeight = pieWidth;
            var pieRadius = Math.min(pieWidth, pieHeight) / 2;

            var pie = d3.pie()
                .sort(null)
                .value(function(d) { return d.count; });
            
            var rotateBy = -Math.PI* 1/2;

            var path = d3.arc()
                .outerRadius(pieRadius - 10)
                .innerRadius(0)
                .startAngle((d) => d.startAngle + rotateBy)
                .endAngle((d) => d.endAngle + rotateBy);

            var label = d3.arc()
                .outerRadius(pieRadius - 40)
                .innerRadius(pieRadius - 40)
                .startAngle((d) => d.startAngle + rotateBy)
                .endAngle((d) => d.endAngle + rotateBy);
                
            var arrPieData = {
                inSystem: {},
                notInSystem: {}
            };
            
            d.find("#tooltip_2_bar_0 tr td").each(function () {
                var arrMatches = $(this).text().trim().match(regExpDataLabels);
                arrPieData.notInSystem[arrMatches[1]] = parseInt(arrMatches[2]);
            })
            d.find("#tooltip_2_bar_1 tr td").each(function () {
                var arrMatches = $(this).text().trim().match(regExpDataLabels);
                arrPieData.inSystem[arrMatches[1]] = parseInt(arrMatches[2]);
            })

            console.log("arrPieData", arrPieData);

            var arrPieData = [{
                label: "In Subsystem",
                count: arrPieData.inSystem.total
            }, {
                label: "Not in Subsystem",
                count: arrPieData.notInSystem.total
            }];

            var arrPieDataSum = 0;
            arrPieData.forEach((d) => arrPieDataSum += d.count);

            var pieContainer = g.append("g")
                .attr("transform", `translate(${BAR_CHART_AREA_WIDTH-0.5*pieWidth-40}, ${BAR_CHART_AREA_HEIGHT-0.5*pieHeight-20})`);
            
            var arrPieCalculationResult = pie(arrPieData);
              var arc = pieContainer.selectAll(".arc")
                .data(arrPieCalculationResult)
                .enter().append("g")
                  .attr("class", "arc");

                var arrColors= ["#5da668", "#eeeeee"];

              arc.append("path")
                  .attr("d", path)
                  .attr("stroke-width", "5px")
                  .attr("stroke", "white")
                  .attr("fill", (d,i) =>  arrColors[i%arrColors.length]);
            
            function funcPieLabelFill(d, i) {
                if (i == 0) {
                    return "#fff";
                }

                return "#666";
            }

            var avgCentroidX = Math.min(path.centroid(arrPieCalculationResult[0])[0], path.centroid(arrPieCalculationResult[1])[0]);

              arc.append("text")
                  .attr("transform", (d) => {console.log("d", d); return `translate(${avgCentroidX}, ${path.centroid(d)[1]})`})
                  .attr("fill", funcPieLabelFill)
                  .attr("font-weight", "bold")
                  .text((d) => d.data.label);

              arc.append("text")
                  .attr("transform", (d) => `translate(${avgCentroidX}, ${path.centroid(d)[1]})`)
                  .attr("text-anchor", "end")
                  .attr("font-size", "30px")
                  .attr("fill", funcPieLabelFill)
                  .attr("dy", "14px")
                  .attr("dx", "-3px")
                  .text((d) => Math.round(100 * d.data.count / arrPieDataSum) + "%");

              arc.append("text")
                    .attr("transform", (d) => `translate(${avgCentroidX}, ${path.centroid(d)[1]})`)
                  .attr("fill", funcPieLabelFill)
                  .attr("dy", "14px")
                  .text((d) => numFormat(d.data.count));
        }
    }
}