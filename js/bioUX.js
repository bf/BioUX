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
                
            console.log("data", data);

            var pre = $("<div/>").text("viz");

            insertAfterElem.after(pre);
        }
    }
}