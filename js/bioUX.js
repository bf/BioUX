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
                top: 20, 
                right: 0, 
                bottom: 30, 
                left: 50
            };

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

            var svg = d3.select($svg[0]);

            var y = d3.scaleBand()
                .range([0, BAR_CHART_AREA_HEIGHT])
                .padding(0);
            var x = d3.scaleLinear().rangeRound([0, BAR_CHART_AREA_WIDTH]);

            var g = svg.append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            y.domain(arrKeys);
            x.domain([0, d3.max(arrValues, (d) => d.count)]).nice();

            g.append("g")
              .attr("class", "axis axis--x")
              .attr("transform", "translate(0," + (BAR_CHART_AREA_HEIGHT - LABEL_FONT_SIZE)  + ")")
              .call(d3.axisBottom(x).ticks())
                .append("text")
                  // .attr("transform", "rotate(-90)")
                  .attr("y", 6)
                  .attr("dy", "0.71em")
                  .attr("text-anchor", "end")
                  .text("Frequency")

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
            
            var enterSelection = g.selectAll(".bar")
                .data(arrFilteredEntries)
                .enter().append("g")

            enterSelection.append("text")
              .text((arr) => arr[0])
              .attr("dx", BAR_HEIGHT * 2)
              .attr("text-anchor", "start")
              .style("font-size", LABEL_FONT_SIZE)
              .attr("x", (arr) => x(0) + 1)
              .attr("y", (arr) => y(arr[0]));
              
            enterSelection.append("text")
              .text((arr) => arr[1].count)
              .attr("dx", -2 * BAR_HEIGHT)
              // .style("opacity", 0.75)
              .attr("text-anchor", "end")
              .style("font-size", LABEL_FONT_SIZE)
              .attr("x", (arr) => x(0) + 1)
              .attr("y", (arr) => y(arr[0]));

            enterSelection.append("rect")
              .attr("fill", (arr) => arr[1].color)
              .attr("x", (arr) => x(0) + 1)
              .attr("y", (arr) => y(arr[0]) - LABEL_FONT_SIZE)
              .attr("width", BAR_HEIGHT)
              .attr("height", LABEL_FONT_SIZE + PADDING_BEFORE_BAR);

            enterSelection.append("rect")
              .attr("class", "bar")
              .attr("fill", (arr) => arr[1].color)
              .attr("x", (arr) => x(0) + 1)
              .attr("y", (arr) => y(arr[0]) + PADDING_BEFORE_BAR)
              .attr("width", (arr) =>  x(arr[1].count) - x(0))
              .attr("height", BAR_HEIGHT);
        }
    }
}