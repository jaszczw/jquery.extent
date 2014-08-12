 /*
 * Copyright 2012, Serge V. Izmaylov
 * Released under GPL Version 2 license.
 */

/*
Flot plugin for rendering gantt-alike bars (extents) on plot canvas.
Plugin assumes extent sizes given in primary x-axis scale.

* Created by Serge V. Izmaylov Mar 2012

Available options are:
series: {
    extents: {
        show: true/false -- enable plugin for given data series,
        lineWidth: -- thickness of mark bar outline
        barHeight: -- height (or width, if you look along x-axis :) of extent bars,
        color: -- bar outline color
        showConnections: true/flase -- extents may depend on each other, so show dependencies
        connectionColor: color for drawind dependency arrows
        fill: true/false -- bars may be filled with color
        fillColor: -- color for filling interior of bar
        showLabels: -- bars may be labeled,
        rowHeight: -- bars are aligned on several rows with that height
        rows: -- how many bar rows used
        barVAlign: "top"/"bottom" -- bar rows may lay on the floor or hang from the ceiling
        labelHAlign: "left"/"right" -- labels may be aligned to left or roght end of bar
    }
}

Extents are defined in series.extentdata:
series {
    extents: { show: true, <here goes extent set specific options> }
    extentdata: [ {
        label: -- (optional) text label for extent
        id: -- (optional) html ID attribute value for label's DIV
        start: -- (mandatory) starting x coordinate of extent
        end: -- (mandatory) ending x coordinate of extent
        row: -- (optional) force that extent to lay in given row 
        labelHalign: -- (optional) change label alignment for that extent only
        color: -- (optiona) change outline color for that extent only
        fillColor: -- (optional) change fill color for that extent only
        depends:  -- (optional) array of 'predcessors' indices
    }, ... ]
}

See samples.html & source below. Feel free to extend the extents.

*/

(function($) {
    var options = {
        series: {
            extents: {
                show: false,
                lineWidth: 1,
                barHeight: 17,
                color: "rgba(192, 192, 192, 1.0)",
                showConnections: true,
                connectionColor: "rgba(0, 192, 128, 0.8)",
                fill: true,
                fillColor: "rgba(64, 192, 255, 0.5)",
                showLabels: true,
                rowHeight: 20,
                rows: 7,
                barVAlign: "top",
                labelHAlign: "left",
                expandBar: 0,
                barWithPointers: false
            }
        }
    };
    
    var savedCtx = null;
    var validExtents = [];
    var rows = [];
	var hovered = [];
	
    function processRawData(plot, series, data, datapoints) {
        if (!series.extents || !series.extents.show)
            return;

        // Fool Flot with fake datapoints
        datapoints.format = [ // Fake format
            {x: true,number: true,required: true}, 
            {y: true,number: true,required: true}, 
        ];
        datapoints.points = []; // Empty data
        datapoints.pointsize = 2; // Fake size

        // Check if we have extents data
        if (series.extentdata == null)
            return;
			
		var extentsData = $.map(series.extentdata, function(value, index) {
			  return [[value.start,value.end,value.label]];
			});
		
		plot.getData();//.series(
			
		validExtents = [];
		rows = [];

        // Process our real data
        var row = 0;
        for (i = 0; i < series.extentdata.length; i++) {
            // Skip bad extents
            if ((series.extentdata[i].start == null) || (series.extentdata[i].end == null))
                continue;
            
            if (series.extentdata[i].end < series.extentdata[i].start) {
                var t = series.extentdata[i].end;
                series.extentdata[i].end = series.extentdata[i].start;
                series.extentdata[i].start = t;
            }
            if ((series.extentdata[i].labelHAlign != "left") && (series.extentdata[i].labelHAlign != "right"))
                series.extentdata[i].labelHAlign = series.extents.labelHAlign;
            
            row = processRawDataRow(series.extentdata[i], series.extents.rows, row);
            
            if (series.extentdata[i].color == null)
                series.extentdata[i].color = series.extents.color;
            if (series.extentdata[i].fillColor == null)
                series.extentdata[i].fillColor = series.extents.fillColor;
            if (series.extentdata[i].barWithPointers == null)
                series.extentdata[i].barWithPointers = series.extents.barWithPointers;
            
            validExtents.push(series.extentdata[i]);
        }
    
    };
    
    function processRawDataRow(rawDataItem, rowSetting, nextRow) {
        if (rowSetting !== 0) {
            if (rawDataItem.row == null) {
                rawDataItem.row = nextRow;
            }
            nextRow = (rawDataItem.row + 1) % rowSetting;
            return nextRow;
        } else {
            if (rawDataItem.row == null) {
                rawDataItem.row = findRowGivenExtendData;
            } else {
                rows[rawDataItem.row] = rows[rawDataItem.row] || [];
                rows[rawDataItem.row].push(rawDataItem);
            }
            return findRowGivenExtendData;
        }
    }
    
    function findRowGivenExtendData(extent) {
        extent = extent || this;
		
        var rowToReturn = null;
        for (var row = 0; row < rows.length; row++) {
            rowToReturn = row;
            for (var elementInRow in rows[row]) {
                if (!(rows[row][elementInRow].end < extent.start || rows[row][elementInRow].start > extent.end)) {
                    rowToReturn = null;
                }
            }
			
            if (rowToReturn != null) {
                if (rows[parseInt(rowToReturn)]) {
                    rows[parseInt(rowToReturn)].push(extent);
                } else {
                    rows[parseInt(rowToReturn)] = [extent];
                }
                return parseInt(rowToReturn);
            }
        }
        rows[rows.length] = [extent];
        return rows.length - 1;
    }
    
    function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        if (typeof stroke == "undefined") {
            stroke = true;
        }
        if (typeof radius === "undefined") {
            radius = 5;
        }
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (stroke) {
            ctx.stroke();
        }
        if (fill) {
            ctx.fill();
        }
    }
    
    function drawSingleExtent(ctx, width, height, xfrom, xto, series, extent) {
        if (xfrom < 0) xfrom = 0;
        if (xto > width) xto = width;
        if (typeof extent.row == "function") extent.row = extent.row();
        xfrom -= series.extents.expandBar;
        xto += series.extents.expandBar;
        var bw = xto - xfrom;
        
        var yfrom;
        if (series.extents.barVAlign == "top")
            yfrom = 4 + series.extents.rowHeight * extent.row;
        else
            yfrom = height - 4 - series.extents.rowHeight * (extent.row) - series.extents.barHeight;
        
        if (series.extents.fill) {
            if (typeof series.extents.fillColor === "object") {
                //Make it consistent with flot API
                var gradient = series.extents.fillColor;
                var grad = ctx.createLinearGradient(xfrom, yfrom, xfrom, yfrom + series.extents.barHeight);
                
                if(hovered[0] === series && hovered[1]===  extent.id){
                    grad.addColorStop(1, gradient.topColor);
                    grad.addColorStop(0, gradient.bottomColor);
                } else{
                    grad.addColorStop(0, gradient.topColor);
                    grad.addColorStop(1, gradient.bottomColor);
                }
                ctx.fillStyle = grad;
            } else {
                ctx.fillStyle = extent.fillColor;
            }
        }
        
        ctx.strokeStyle = extent.color;
        roundRect(ctx, xfrom, yfrom, bw, series.extents.barHeight, 5, series.extents.fill, true);
        if (extent.barWithPointers) {
            drawPointers(ctx, xfrom, yfrom, xto, series);
        }
    }
    
    function drawPointers(ctx, xfrom, yfrom, xto, series) {
        //draw Left Pointers
        ctx.beginPath();
        ctx.moveTo(xfrom + series.extents.expandBar / 2, yfrom + series.extents.barHeight);
        ctx.lineTo(xfrom + series.extents.expandBar, yfrom + series.extents.barHeight + series.extents.expandBar / 2);
        ctx.lineTo(xfrom + series.extents.expandBar * 3 / 2, yfrom + series.extents.barHeight);
        ctx.fill();

        //draw Right Pointers
        ctx.beginPath();
        ctx.moveTo(xto - series.extents.expandBar / 2, yfrom + series.extents.barHeight);
        ctx.lineTo(xto - series.extents.expandBar, yfrom + series.extents.barHeight + series.extents.expandBar / 2);
        ctx.lineTo(xto - series.extents.expandBar * 3 / 2, yfrom + series.extents.barHeight);
        ctx.fill();
    }
    
    function drawSingleConnection(ctx, width, height, xfrom, xto, rfrom, rto, series) {
        if (xfrom < 0) xfrom = 0;
        if (xto > width) xto = width;
        
        var yfrom, yto;
        if (series.extents.barVAlign == "top") {
            yfrom = 4 + Math.round(series.extents.rowHeight * rfrom) + Math.round(series.extents.barHeight * 0.5);
            yto = 4 + Math.round(series.extents.rowHeight * rto) + Math.round(series.extents.barHeight * 0.5);
        } else {
            yfrom = height - 4 - Math.round(series.extents.rowHeight * rfrom) - Math.round(series.extents.barHeight * 0.5);
            yto = height - 4 - Math.round(series.extents.rowHeight * rto) - Math.round(series.extents.barHeight * 0.5);
        }
        
        ctx.beginPath();
        ctx.moveTo(xfrom, yfrom);
        ctx.lineTo(xfrom + 10, yfrom);
        ctx.lineTo(xto - 10, yto);
        ctx.lineTo(xto, yto);
        ctx.lineTo(xto - 6, yto - 3);
        ctx.lineTo(xto - 6, yto + 3);
        ctx.lineTo(xto, yto);
        ctx.stroke();
    }
    
    // function naiveStrip(html) 
    // {
        // var tmp = document.createElement("DIV");
        // tmp.innerHTML = html;
        // return tmp.textContent || tmp.innerText;
    // }
    
    function addExtentLabel(placeholder, plotOffset, width, xfrom, xto, series, extent) {
        var styles = [];
        if (series.extents.barVAlign == "top")
            styles.push("top:" + Math.round((plotOffset.top + series.extents.rowHeight * extent.row + 4)) + "px");
        else
            styles.push("bottom:" + Math.round((plotOffset.bottom + series.extents.rowHeight * extent.row + 4)) + "px");
        if (extent.labelHAlign == "left")
            styles.push("left:" + Math.round((plotOffset.left + xfrom + 3)) + "px");
        else
            styles.push("right:" + Math.round((plotOffset.right + (width - xto) + 3)) + "px");
        styles.push("width:" + Math.round(xto - xfrom) + "px");
        styles.push("");
        
        
		placeholder.append('<div ' + ((extent.id != null) ? ('id="' + extent.id + '" ') : '') + ' class="extentLabel" style="font-size:smaller;position:absolute;' + (styles.join(';')) + '">' + extent.label + '</div>');
        // placeholder.append('<div ' + ((extent.id != null) ? ('id="' + extent.id + '" ') : '') + 'title="' + naiveStrip(extent.label) + '" class="extentLabel" style="font-size:smaller;position:absolute;' + (styles.join(';')) + '">' + extent.label + '</div>');
    }
    
    function drawSeries(plot, ctx, series) {
        if (!series.extents || !series.extents.show || !series.extentdata)
            return;
        
        var placeholder = plot.getPlaceholder();
        placeholder.find(".extentLabel").remove();
        
        ctx.save();
        
        var plotOffset = plot.getPlotOffset();
        var axes = plot.getAxes();
        var yf = axes.yaxis.p2c(axes.yaxis.min);
        var yt = axes.yaxis.p2c(axes.yaxis.max);
        var ytop = (yf > yt) ? yt : yf;
        var ybot = (yf > yt) ? yf : yt;
        var width = plot.width();
        var height = plot.height();
        
        ctx.translate(plotOffset.left, plotOffset.top);
        ctx.lineJoin = "round";
        
        for (var i = 0; i < series.extentdata.length; i++) {
            var xfrom, xto;
            if ((series.extentdata[i].start == null) || (series.extentdata[i].end == null))
                continue;
            if ((series.extentdata[i].start < axes.xaxis.max) && (series.extentdata[i].end > axes.xaxis.min)) {
                xfrom = axes.xaxis.p2c((series.extentdata[i].start < axes.xaxis.min) ? axes.xaxis.min : series.extentdata[i].start);
                xto = axes.xaxis.p2c((series.extentdata[i].end > axes.xaxis.max) ? axes.xaxis.max : series.extentdata[i].end);
                drawSingleExtent(ctx, width, height, xfrom, xto, series, series.extentdata[i]);
                
                if (series.extents.showConnections && (series.extentdata[i].start > axes.xaxis.min) && (series.extentdata[i].start < axes.xaxis.max))
                    if ((series.extentdata[i].depends != null) && (series.extentdata[i].depends.length != null) && (series.extentdata[i].depends.length > 0))
                        for (var j = 0; j < series.extentdata[i].depends.length; j++) {
                            var k = series.extentdata[i].depends[j];
                            if ((k < 0) || (k >= series.extentdata.length))
                                continue;
                            if ((series.extentdata[k].start == null) || (series.extentdata[k].end == null))
                                continue;
                            var cxto = xfrom;
                            var cxfrom = series.extentdata[k].end;
                            if (cxfrom < axes.xaxis.min)
                                cxfrom = axes.xaxis.min;
                            if (cxfrom > axes.xaxis.max)
                                cxfrom = axes.xaxis.max;
                            cxfrom = axes.xaxis.p2c(cxfrom);
                            ctx.strokeStyle = series.extents.connectionColor;
                            drawSingleConnection(ctx, width, height, cxfrom, cxto, series.extentdata[k].row, series.extentdata[i].row, series);
                        }
                
                if (series.extents.showLabels && (series.extentdata[i].label != null))
                    addExtentLabel(placeholder, plotOffset, width, xfrom, xto, series, series.extentdata[i]);
            }
        }
        
        ctx.restore();
        savedCtx = ctx;
    };
    
    
    function highlightExtent(series,dataIndex,plot){
		plot = plot || this;
		if(!hovered || hovered[0]!=series && hovered[1]!=dataIndex){
			hovered = [series,dataIndex];
			plot.draw();
		} 
	}
	
	function unhighlightExtents(plot){
		plot = plot || this;
		if (hovered[0]!=null){
			hovered = [];
			plot.draw();
		}
	}
	
    
    function init(plot) {
        function onMouseMove(e,triggeredEvent) {
            triggerClickHoverEvent("plothover", triggeredEvent || e);
			return true;
        }
        
        function onClick(e,triggeredEvent) {
            triggerClickHoverEvent("plotclick",triggeredEvent ||  e);
			return true;
        }
		
		function getMousePos(canvas, evt) {
			var rect = canvas.getBoundingClientRect();
			return {
			  x: evt.clientX - rect.left,
			  y: evt.clientY - rect.top
			};
		  }
		  
        
        function findNearbyExtent(mouseX, mouseY) {
            var item = null
            var series = plot.getData(), 
            options = plot.getOptions(), 
            x, y;
            
            for (var i = 0; i < series.length; ++i) {
                
                var s = series[i];
                var k = getMousePos(plot.getCanvas(),{clientX: mouseX, clientY: mouseY});
				
                if (s.extents.show) {
				
					for (var j = 0; j < s.extentdata.length; ++j) {
					
						var startOfBar = plot.height()- s.extents.barHeight -4 - s.extents.rowHeight*s.extentdata[j].row,
							endOfBar = plot.height() - s.extents.rowHeight*s.extentdata[j].row;
						
						
						if( (s.extentdata[j].start.getTime() < s.xaxis.c2p(mouseX+s.extents.expandBar)) &&
							(s.extentdata[j].end.getTime() > s.xaxis.c2p(mouseX-s.extents.expandBar)) &&
							(mouseY < endOfBar) &&
							(mouseY > startOfBar)){
							return {
								datapoint: [s.extentdata[j].start.getTime(), s.extentdata[j]],
								dataIndex: j,
								series: s,
								seriesIndex: i
							};
						}
					}
                }
            }
			
            return item;
        }
        
        
        function triggerClickHoverEvent(eventname, e) {
            var offset = plot.offset();
            var canvasX = parseInt(e.pageX - offset.left);
            var canvasY = parseInt(e.pageY - offset.top);
            var item = findNearbyExtent(canvasX, canvasY);
            
            var pos = {pageX: e.pageX,pageY: e.pageY};
			var target = $(plot.getCanvas()).parent();
			
			
			if (item){
				highlightExtent(item.series,item.dataIndex,plot)
			} else{
				unhighlightExtents(plot);
			}
			
			
			target.trigger(eventname, [pos, item,true]);
        }
		
		plot.highlightExtent = highlightExtent;
		plot.unhighlightExtents = unhighlightExtents;
        
        plot.hooks.processRawData.push(processRawData);
        plot.hooks.drawSeries.push(drawSeries);
        plot.hooks.bindEvents.push(function(plot, eventHolder) {
            var options = plot.getOptions();
            if (options.extents.show) {
                if (options.grid.hoverable) {
					eventHolder.mousemove(onMouseMove);
                    // eventHolder.unbind('mousemove').mousemove(onMouseMove);
                }
                if (options.grid.clickable) {
                    eventHolder.click(onClick);
                    // eventHolder.unbind('onClick').click(onClick);
                }
            }
        });
    };
    
    $.plot.plugins.push({
        init: init,
        name: "extents",
        options: options,
        version: "0.3"
    });
})(jQuery);
