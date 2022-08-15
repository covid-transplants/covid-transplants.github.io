"use strict";

;(function(){

    //from: https://gist.github.com/endel/321925f6cafa25bbfbde
    Number.prototype.pad = function(size) {
        var s = String(this);
        while (s.length < (size || 2)) {s = "0" + s;}
        return s;
    }

    /* Configuration values */

    // Set the dimensions of the plot (in pixels)
    const plot_width = 750;
    const plot_height = 450;
    const margin = {top: 30, right: 80, bottom: 50, left: 50};

    // The "id=" value of the HTML element in which to create the plot.
    const id_transplants_plot = "transplants_plot";

    // The "id=" value of the HTML element in which to create the plot legend
    const id_transplants_legend = "transplants_legend";

    const yaxis2_label = "COVID Cases" ;


    // The "id=" value of the HTML element in which to create the secondary bar plot.
    const bar_plot_width = 80;
    const bar_plot_height = 140;
    const barplot_rect_width = 15 ; /* width of each bar */
    const bar_margin = {top: 20, right: 15, bottom: 30, left: 15};
    const id_transplants_bar_plot = "transplants_bar_plot";

    // HTML element with the attribute:
    //      data-update="transplants-plot"
    // will automatically gain an "onchage" event that will refresh this plot.
    const data_attr_update = "[data-update='transplants-plot']";

    const transplants_tsv_file = "/static/transplants-plot.DONOR_TYPE.tsv";
    const covid_cases_tsv_file = "/static/covid-cases.tsv";
    const total_transplants_tsv_file = "/static/transplants-counts.DONOR_TYPE.tsv";


    /* Don't change things below this point */
    if ('undefined' === typeof jQuery) {
        console.log("transplants-plot.js: error: jQuery not loaded");
    }
    if ('undefined' === typeof d3) {
        console.log("transplants-plot.js: error: d3 not loaded");
    }

    // This is only to change country colors in legend
    const transplant_plot_colors_by_country_values = {
        "Argentina" : "#a6cee3",
        "Austria"   : "#654254",
        "Belgium"   : "#A43E24",
        "Brazil"    : "#1f78b4",
        "Canada"    : "#DE1287",
        "Chile"     : "#b2df8a",
        "Croatia"   : "#4De7b1",
        "Finland"   : "#33a02c",
        "France"    : "#fb9a99",
        "Germany"   : "#e31a1c",
        "Greece"    : "#65bf24",
        "Hungary"   : "#98af3e",
        "Italy"     : "#fdbf6f",
        "Japan"     : "#778899",
        "Netherlands":"#e45f98",
        "Norway"    : "#2167a3",
        "Portugal"  : "#ff7f00",
        "Slovenia"  : "#32afce",
        "Spain"     : "#cab2d6",
        "Switzerland" : "#6a3d9a",
        "United Kingdom" : "#cc5500",
        "US"        : "#f5f5f5",
    };
    var transplot_plot_colors_by_index = Object.values(transplant_plot_colors_by_country_values);


    // Variable holding the loaded TSV data
    var data;
    var covid_cases_data;
    var total_transplants_data;
    var total_transplants_region_max = {} ;


    //D3 Globals
    var x,y,xAxis,yAxis,x_gridlines,
        y_gridlines, svg, tooltip_div;
    var d3line;
    var y2, yAxis2;
    var d3line2;

    var tipBox, tooltipLine;

    // Bar Plot variables
    var barplot = {};

    var tooltip_values = {} ;

    function create_bar_graph()
    {
        // Barchart with d3v4: http://bl.ocks.org/flunky/1a8b1bb608c06736f1ed4015065cbbb0

        const width = bar_plot_width - bar_margin.left - bar_margin.right;
        const height = bar_plot_height - bar_margin.top - bar_margin.bottom;

        barplot.height = height ;
        barplot.width = width ;

        barplot.svg = d3.select("#" + id_transplants_bar_plot)
            .append("svg")
              .attr("preserveAspectRatio", "xMinYMin meet")
              .attr("viewBox", "0 0 " + bar_plot_width + " " + bar_plot_height)
              .classed("transplants-plot", true)
              .classed("transplants-bar-plot", true)
            .append("g")
              .attr("transform",
                    "translate(" + bar_margin.left + "," + bar_margin.top + ")");

        // Create the X and Y axis scales
        barplot.x = d3.scaleBand().range([ 0, width ]);
        barplot.y = d3.scaleLinear().range([ height, 0]);

        // Create the X axis object
        barplot.xAxis = d3.axisBottom(barplot.x);

        // Add the xAxis to the drawing
        barplot.svg.append("g")
            .attr("id","x-axis")
            .attr("transform", "translate(0," + height + ")")
            .call(barplot.xAxis);

        /*
        // text label for the x axis
        barplot.svg.append("text")
            .attr("id","xaxis-label")
            .attr("transform",
                  "translate(" + (width/2) + " ," +
                  (height + bar_margin.top+20) + ")")
            .style("text-anchor", "middle")
            .text("FOO");
        */

        /*
        // Add Y axis
        barplot.yAxis = d3.axisLeft(barplot.y);

        barplot.svg.append("g")
            .attr("id","y-axis")
            .call(barplot.yAxis);

        // text label for the y axis
        barplot.svg.append("text")
            .attr("id","yaxis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x",0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("count");
        */


        // Update Data - domain
        barplot.x.domain([2019,2020]);
        barplot.y.domain([0,40000]);  /* Bar plot max-height - currently hard-coded */

        // Update X axis (after updated dmoain)
        barplot.svg.select("#x-axis")
            .transition()
            .duration(100)
            .call(barplot.xAxis);

        var bardata = [ {year: 2019, value:1},
                        {year: 2020, value:4}
                      ];

        barplot.svg.selectAll("rect")
            .data(bardata)
            .enter().append("rect")
            .attr("width",barplot_rect_width)
            .attr("class",function(d) { return "y" + d.year ; })
            .attr("height",function(d) { var v = height - barplot.y(d.value); return v; })
            .attr("x",function(d) { var v = barplot.x(d.year);
                                    return v + bar_plot_width/4 - barplot_rect_width; }) // +10 to shift the bar to the center of the xAxis tick
            .attr("y",function(d) { var v = barplot.y(d.value); return v ;});

	barplot.svg.selectAll("text.value-label")
	    .data(bardata)
	    .enter()
	    .append("text")
	    .attr("class","value-label")
	    .attr("transform", "")
            .attr("x",function(d) { var v = barplot.x(d.year);
				    return v + barplot_rect_width/2 + 5; })
            .attr("y",function(d) { var v = barplot.y(d.value); return v ;})
            .attr("dy", "1em")
            .style("text-anchor", "middle")
	    .text(function(x){return x.value;});

        window.barplot = barplot;
    }


    function month_day_to_date(month_day_string)
    {
        // Converts "03-04" to "new Date(2001, 02,04)" representing March 4th.
        var month,day;
        [month,day] = month_day_string.split("-").map(x => parseInt(x))
        return new Date(2001,month-1,day);
    }

    function update_bar_chart(count2019,count2020,max_y)
    {
        var bardata = [ {year: 2019, value:count2019},
                        {year: 2020, value:count2020} ];

        //const bar_rect_width = 20 ;

        // Adjust the bar-plot's Y axis max height, as values vary wildly.
        barplot.y.domain([0,max_y]);

        var paths = barplot.svg.selectAll("rect").
            data(bardata);

        paths.transition()
            .duration(500)
            .attr("height",function(d) { var v = barplot.height - barplot.y(d.value); return v; })
            .attr("y",function(d) { var v = barplot.y(d.value); return v ;});


        var value_labels = barplot.svg.selectAll("text.value-label").data(bardata);

        value_labels.transition()
            .duration(500)
            .attr("y",function(d) { var v = barplot.y(d.value); return v-10 ;})
            .style("text-anchor", "middle")
            .text(function(x){
                return x.value;
            });

    }

    function create_graph()
    {
        const width = plot_width - margin.left - margin.right;
        const height = plot_height - margin.top - margin.bottom;

        // Parse the date / time
        //var parseDate = d3.time.format("%d-%b-%y").parse;

        // Adds the svg canvas
        svg = d3.select("#" + id_transplants_plot)
            .append("svg")
              .attr("preserveAspectRatio", "xMinYMin meet")
              .attr("viewBox", "0 0 " + plot_width + " " + plot_height)
              .classed("transplants-plot", true)
              .classed("svg-content", true)
            .append("g")
              .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

        // Create the X and Y axis scales
        x = d3.scaleTime()
            .range([ 0, width ]);
        y = d3.scaleLinear()
            .range([ height, 0]);
        y2 = d3.scaleLinear()
            .range([ height, 0]);

        // Define lines
        d3line = d3
            .line()
            .x(function(d) {
                
                var tmp = x(month_day_to_date(d["date"]));
                return tmp;
            })
            .y(function(d) {
                var tmp = y(d["value"]);
                return tmp;
            });

        d3line2 = d3
            .line()
            .x(function(d) {
                var tmp = x(month_day_to_date(d["date"]));
                return tmp;
            })
            .y(function(d) {
                var tmp = y2(d["count"]);
                return tmp;
            });

        // Create the X axis object
        xAxis = d3.axisBottom(x);

        // Add the xAxis to the drawing
        svg.append("g")
            .attr("id","x-axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        // text label for the x axis
        svg.append("text")
            .attr("id","xaxis-label")
            .attr("transform",
                  "translate(" + (width/2) + " ," +
                  (height + margin.top + 20) + ")")
            .style("text-anchor", "middle")
            .text("Date");

        // Y Axis Gridline
        x_gridlines = d3.axisBottom()
            .ticks(8)
            .tickFormat("")
            .tickSize(height)
            .scale(x);

        svg.append("g")
            .attr("id","x-axis-gridlines")
            .attr("class", "grid")
            .call(x_gridlines);

        // Add Y axis
        yAxis = d3.axisLeft(y);

        svg.append("g")
            .attr("id","y-axis")
            .call(yAxis);

        // text label for the y axis
        svg.append("text")
            .attr("id","yaxis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x",0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Number of Transplants");

        // Y Axis Gridline
        y_gridlines = d3.axisLeft()
            .ticks(5)
            .tickFormat("")
            .tickSize(-width)
            .scale(y);

        svg.append("g")
            .attr("id","y-axis-gridlines")
            .attr("class", "grid")
            .call(y_gridlines);

        // Add second Y axis
        yAxis2 = d3.axisRight(y2);

        svg.append("g")
            .attr("id","y-axis2")
            .attr("transform","translate(" + width + ",0)")
            .call(yAxis2);

        // text label for the second y axis
        svg.append("text")
            .attr("id","yaxis2-label")
            .attr("transform", "rotate(90)")
            .attr("y",-width - margin.right)
            .attr("x",0 + (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(yaxis2_label);

        // Define the div for the tooltip
        tooltip_div = d3.select("body").append("div")
            .attr("class", "transplant_plot_tooltip")
            .style("display","none")
            .html("");

        // Vertical Line used to indicate tooltip
        tooltipLine = svg.append('line')
            .attr("stroke","black")
            .classed("tooltipline",true);

        // Tooltip rect: http://bl.ocks.org/wdickerson/64535aff478e8a9fd9d9facccfef8929
        tipBox = svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('opacity', 0)
            .on('mousemove', drawTooltip)
            .on('mouseout', removeTooltip);
    }

    function removeTooltip() {
        //console.log("moouse out");
        if (tooltip_div) tooltip_div.style('display', 'none');
        if (tooltipLine) tooltipLine.style('opacity', 0);
    }

    function drawTooltip() {
        //http://bl.ocks.org/wdickerson/64535aff478e8a9fd9d9facccfef8929
        //console.log("mouse move");

        const mouse = d3.mouse(tipBox.node());
        //console.log("mouse = ", mouse);

        const back_date = x.invert(mouse[0]);
        //console.log("back_date = ", back_date);
        const chopped_date = new Date(back_date.toDateString());
        //console.log("chopped_date = ", chopped_date);

        tooltipLine
            .style('opacity',1)
            .attr('x1', x(chopped_date))
            .attr('x2', x(chopped_date))
            .attr('y1', 0)
            .attr('y2', plot_height - margin.top - margin.bottom);


        const month = chopped_date.toLocaleString('default', { month: 'long' });
        var date_str = "Date: " + month + " " + chopped_date.getDate();
        var date_idx = (chopped_date.getMonth()+1).pad(2) + "-" + chopped_date.getDate().pad(2);
        var values = tooltip_values[date_idx];


        //DEBUG:
        //console.log("date_idx = ", date_idx);
        //console.log("final values = ", values);

        var tooltip_text = date_str + "<br/>" + values.join("<br/>");

        tooltip_div
            .style('display', 'block')
            .style('left', (d3.event.pageX + 20) + "px")
            .style('top',  (d3.event.pageY - 20) + "px")
            .html(tooltip_text);
    }

    function update_graph_axis_domains(xrange, yrange, animation_duration)
    {
        //console.log("xrange = ", xrange);
        //console.log("yrange = ", yrange);

        x.domain(xrange);
        y.domain(yrange);

        // Update X axis
        svg.select("#x-axis")
            .transition()
            .duration(animation_duration)
            .call(xAxis);

        // Update X axis Girdlines
        svg.select("#x-axis-gridlines")
            .transition()
            .duration(animation_duration)
            .call(x_gridlines);

        // Update Y axis
        svg.select("#y-axis")
            .transition()
            .duration(animation_duration)
            .call(yAxis);

        // Update Y axis Girdlines
        svg.select("#y-axis-gridlines")
            .transition()
            .duration(animation_duration)
            .call(y_gridlines);

        // Update second Y axis
        svg.select("#y-axis2")
            .transition()
            .duration(animation_duration)
            .call(yAxis2);
    }

    function update_2nd_axis(data)
    {
        y2.domain(d3.extent(data, function(x){return x.count;}));

        // Update second Y axis
        svg.select("#y-axis2")
            .transition()
            .duration(500)
            .call(yAxis2);

        //console.log("2nd data = ", data);

        var rejoin = svg.selectAll("path.covidline")
            .data([data]) ;

        var paths = rejoin.enter()
            .append("path")
            .attr("class","covidline")
            .style('opacity',0)
            .merge(rejoin);

        paths.transition()
            .duration(500)
            .style('opacity',1)
            .attr("d", function(d) {
                //console.log("d2 = ", d);
                return d3line2(d);
            })
            .attr("stroke", "cyan");

        rejoin.exit()
            .transition()
            .duration(500)
            .style('opacity',0)
            .remove();
    }


    function update_graph(data,set_axis,color_mode)
    {
        //console.log("Update_graph, color_mode = ", color_mode);

        //DEBUG
        //console.log("transplat update-graph, data =", data);

        var xrange = [Infinity,0];
        var yrange = [0,0];
        data.forEach(function(x){
            var tx = d3.extent(x, function(d){
                return month_day_to_date(d.date);
            });
            var ty = d3.extent(x, function(d){return d.value;});

            //console.log("x = ", x);
            //console.log("tx = ", tx);

            xrange[0] = d3.min([tx[0], xrange[0]]);
            xrange[1] = d3.max([tx[1], xrange[1]]);
            yrange[0] = d3.min([ty[0], yrange[0]]);
            yrange[1] = d3.max([ty[1], yrange[1]]);
        });
        yrange[1] *= 1.1 ;

        //DEBUG
        //console.log("xrange = ", xrange);
        //console.log("yrange = ", yrange);

        if (set_axis) {
            update_graph_axis_domains(xrange, yrange, 500);
        }

        /*
          svg.select("#xaxis-label")
          .transition()
          .duration(500)
          .text(xaxis_label);

          svg.select("#yaxis-label")
          .transition()
          .duration(500)
          .text(yaxis_label);
        */

        // Add the scatterplot
        var rejoin = svg.selectAll("path.dataline")
            .data(data) ;

        //Draw a PATH
        var paths = rejoin.enter()
            .append("path")
            .attr("class","dataline")
            .style('opacity',0)
            .merge(rejoin);

        paths.transition()
            .duration(500)
            .style('opacity',1)
            .attr("d", function(d) {
                return d3line(d);
            })
            .attr("stroke", function(d,idx){
                if (color_mode == "2020_single_color") {
                    return d3.schemeCategory20[1];
                } else if (color_mode=="color_by_country") {
                    return transplot_plot_colors_by_index[idx];
                } else if (color_mode=="two_colors") {
                    return d3.schemeCategory20[idx%2];
                } else {
                    console.log("ERROR: invalid color_mode: ", color_mode);
                }
                //console.log("stroke, idx = ", idx);
                //return "red";
            });

        rejoin.exit()
            .transition()
            .duration(500)
            .style('opacity',0)
            .remove();


/*        all_items.on("mouseover", function(d) {
            tooltip_div.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip_div.html(d.schl_name + "<br/>" + "Position: " + xfunc(d) + "," + yfunc(d))
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
            .on("mouseout", function(d) {
                tooltip_div.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
*/
    }


    function group_by_country(data)
    {
        var output = data.map(function(x){
            organ = x.organ;
            country = "all";
            return { date:x.date, organ:organ, country:country, avg:x.avg } ;
        });
        output.sort(function(a,b){
            if ( a.date > b.date ) {  return 1 ; }
            if ( a.date < b.date ) {  return -1 ; }
            if ( a.organ > b.organ ) { return 1 ; }
            if ( a.organ < b.organ ) { return -1 ; }
            return 0 ;
        });
        var output2 = [] ;
        var last_date = null, last_organ, last_country;
        var avg_sum = 0;
        output.forEach(function(x){
            if (last_date != x.date || last_organ != x.organ || last_country != x.country) {
                if (last_date) {
                    const r =  { date:last_date, organ:last_organ, country:last_country, avg:avg_sum } ;
                    output2.push(r);
                }
                avg_sum = 0 ;
            } else {
                avg_sum += x.avg ;
            }
            last_date = x.date ;
            last_organ = x.organ ;
            last_country = x.country ;
        });
        const r =  { date:last_date, organ:last_organ, country:last_country, avg:avg_sum } ;
        output2.push(r);

        return output2;
    }

    function aggregate_data(data, aggregate_by)
    {
        // Find the last date for which all countries have data
        var last_dates = {} ;
        data.forEach(function(x){
            let key = x[aggregate_by];
            let date = x.month_day ;

            if (key in last_dates) {
                last_dates[key] = date;
            } else {
                last_dates[key] = d3.max(date, last_dates[key]);
            }
        });
        //DEBUG
        //console.log("transplant-plot, aggregate data by ", aggregate_by, ", last_dates = ", last_dates);
        let last_date_values =  $.map(last_dates, function(value, key) { return value });
        var min_end_date = d3.min  ( last_date_values );
        //console.log("min_end_date = ", min_end_date);

        //Discard entries later then the miminum-end-date
        var output = data.filter(function(x){return x.month_day<min_end_date;});


        output = output.map(function(x) {
            // This makes a  deep-copy of dictionary x
            // (e.g. { month_day:"04-29",organ:"kidney",country:"brazil", ... }
            var tmp = Object.assign({},x);
            // and then override the field we want to aggregate by
            // (should be "organ" or "country")
            tmp[aggregate_by] = "all";
            return tmp;
        });


        // sort the data (with overriden fields appearing in sequence)
        output.sort(function(a,b){
            if ( a.month_day > b.month_day ) {  return 1 ; }
            if ( a.month_day < b.month_day ) {  return -1 ; }
            if ( a.organ > b.organ ) { return 1 ; }
            if ( a.organ < b.organ ) { return -1 ; }
            if ( a.country > b.country ) { return 1 ; }
            if ( a.country < b.country ) { return -1 ; }
            return 0 ;
        });

        // Merge identical consequtive elements (while summing-up their averages)
        var output2 = [] ;
        var last_month_day = null, last_organ, last_country;
        var avg_2019_sum = 0;
        var avg_2020_sum = 0;
        output.forEach(function(x){
            if (last_month_day != x.month_day || last_organ != x.organ || last_country != x.country) {
                if (last_month_day) {
                    const r =  { month_day:last_month_day,
                                 organ:last_organ,
                                 country:last_country,
                                 avg_2019:avg_2019_sum,
                                 avg_2020:avg_2020_sum } ;
                    output2.push(r);
                }
                avg_2019_sum = 0 ;
                avg_2020_sum = 0 ;
            }
            last_month_day = x.month_day ;
            last_organ = x.organ ;
            last_country = x.country ;
            avg_2019_sum += x.avg_2019 ;
            avg_2020_sum += x.avg_2020 ;
        });
        output2.push({ month_day:last_month_day,
                       organ:last_organ,
                       country:last_country,
                       avg_2019:avg_2019_sum,
                       avg_2020:avg_2020_sum });
        return output2;
    }

    function filter_by_organ(data,organ)
    {
        if (organ === "all") {
            // Do nothing - keep all organs
        } else if (organ === "combined") {
            data = aggregate_data(data,"organ");
        } else {
            // Filter by specific organ
            data = data.filter(function(x){ return x.organ == organ; });
        }
        return data;
    }

    function filter_by_region(data,region)
    {
        if (region === "all") {
            // Do nothing - keep all regions
        } else {
            // Filter by specific country, or by "global" (which is a artificial 'country' in the data file)
            data = data.filter(function(x){ return x.country == region; });
        }
        return data;
    }

    function update_graph_gui()
    {
        //var region = $("#region").children("option:selected"). val();
        var region = $("input[name='transplants-region']").val();
        var organ = $("input[name='transplants_organ']:checked").val();
        //Checking which period (2019/2020) comes later...

        //console.log("region = ", region);

        //Ugly for now:
        if (region == "europe") { region = "France"; }
        if (region == "northamerica") { region = "US"; }
        if (region == "southamerica") { region = "Brazil"; }
	    if (region == "asia") { region = "Malaysia"; }



        var all = data ;
        all = filter_by_organ(all, organ);
        all = filter_by_region(all, region);

        //console.log("data after filtering by region/organ:", all);


        // Check which periods have data
        var have_2020 = all.some(function(x){return x.avg_2020 && x.avg_2020 > 0;});
        var have_2019 = all.some(function(x){return x.avg_2019 && x.avg_2019 > 0;});
        //console.log("region ", region, "organ", organ, "have_2020",have_2020, "have_2019", have_2019);


        if (have_2019) {
            $(".require_2019_data").prop("disabled", false);
        } else {
            $(".require_2019_data").prop("disabled", true);
            var selectedIndex = $("#period").prop("selectedIndex");
            if (selectedIndex<3) {
                $("#period").prop("selectedIndex",4);
            }
        }

        var period = $("#period").children("option:selected").val();


        // Split/reshap data by period/year:
        var series = {} ;
        all.forEach(function(x){
            var label = ( region == "all") ? x.country : "" ;
            label += " " ;
            label += (organ == "all") ? x.organ : "";

            if (period == "2019") {
                if (! (label in series)) {
                    series[label] = []
                }
                var t = { date : x.month_day,
                          value : x.avg_2019 };
                series[label].push(t);
            } else if (period == "2020") {
                if (! (label in series)) {
                    series[label] = []
                }
                var t = { date : x.month_day,
                          value : x.avg_2020 };
                series[label].push(t);
            } else if (period == "ratio") {
                if (! (label in series)) {
                    series[label] = []
                }
                var t = { date : x.month_day,
                          value : x.avg_2020 / x.avg_2019 };
                if (isFinite(t.value))
                    series[label].push(t);
            } else if (period == "ratio_log") {
                if (! (label in series)) {
                    series[label] = []
                }
                var t = { date : x.month_day,
                          value : Math.log10(x.avg_2020 / x.avg_2019) };
                if (isFinite(t.value))
                    series[label].push(t);
            } else if (period == "both") {
                var label_2019 = label + " 2019";
                if (! (label_2019 in series)) {
                    series[label_2019] = [];
                }
                var t = { date : x.month_day,
                          value : x.avg_2019 };
                if (isFinite(t.value))
                    series[label_2019].push(t);

                var label_2020 = label + " 2020";
                if (! (label_2020 in series)) {
                    series[label_2020] = [];
                }
                var t = { date : x.month_day,
                          value : x.avg_2020 };
                if (isFinite(t.value))
                    series[label_2020].push(t);
            }
        });
        console.log("after split by periods = ", series);


        // Convert to array-of-arrays
        var labels = Object.keys(series);
        var series = Object.values(series);

        var color_mode = "two_colors";
        if ( (region =="all") && ( (period=="2020" || period=="2019") ) ) {
            color_mode = "color_by_country";
        } else if (period=="2020") {
            color_mode = "2020_single_color";
        }


        // Update Legend
        var tbl = $("#" + id_transplants_legend);
        tbl.empty();
        labels.forEach(function(name,idx){
            //console.log("label = ", name);
            var clr = "#F0F" ;
            if (color_mode == "color_by_country") {
                clr =  transplot_plot_colors_by_index[idx];
            } else {
                clr = d3.schemeCategory20[idx%2];
            }
            tbl.append(`<tr><td class="legend_square" style="background-color: ${clr}"</td><td style="color: ${clr}">${name}</td></tr>`);
        });

        // Find the minimum start date that exists for all data series
        var start_dates = series.map(function(x){return x[0].date;});
        var max_start_date = d3.max(start_dates);
        // Remove all entries that are ealier than this date.
        var trimmed_series = [];
        series.forEach(function(data){
            data = data.filter(function(x){return x.date >= max_start_date;});
            trimmed_series.push(data);
        });

        //Collect all values into a dictionary of "date" =>  ["value","value","value"]
        //for easier tool tip value extraction.
        tooltip_values = [] ;
        trimmed_series.forEach(function(series_data,series_idx){
            const series_label = labels[series_idx];

            series_data.forEach(function(datum){
                const date = datum.date;
                const value = datum.value;
                if (! (date in tooltip_values)) {
                    tooltip_values[date] = [];
                }
                tooltip_values[date].push(series_label + " = " + value.toFixed(2));
            });
        });

	// Check if there were ZERO transplants of this organ in this country.
	// If so, show a clarification message.
	var all_zeros = trimmed_series.map(function(data_series){
	    return data_series.every(item => item.value == 0);
	});
	var all_zero_warning = $("#all_zero_warning");
	if (all_zeros.every(value => value)) {
	    all_zero_warning.removeClass("d-none");
	} else {
	    all_zero_warning.addClass("d-none");
	}

        //console.log("trimmed_series = ", trimmed_series);

        update_graph(trimmed_series, true, color_mode);

	//The last date shown in the data series - use it to trim the COVID line.
	var end_dates = trimmed_series.map(function(x){return x[x.length-1].date;});
        var max_end_date = d3.max(end_dates);


        // 2nd Y Axis - Covid cases
        var covid_region = (region=="all")?"global":region;
        var covid_data = covid_cases_data.filter(function(x){return x.country == covid_region});
        covid_data = covid_data.filter(function(x){return x.date >= max_start_date && x.date <= max_end_date;});
        //console.log("covid-region =",covid_region);
        //console.log("covid_data = ",covid_data);

        update_2nd_axis(covid_data);


	/* Calculate total number of transplants for 2019/2020 */
	var counts2019 = total_transplants_data.filter(function(x){return +x.year == 2019;})
	var counts2020 = total_transplants_data.filter(function(x){return +x.year == 2020;})
	// filter by region, if needed
	if ((region != "global") && (region != "all")) {
	    counts2019 = counts2019.filter(function(x){return x.country==region;});
	    counts2020 = counts2020.filter(function(x){return x.country==region;});
	}

	// Extract the relevant organ
	var data_key = (organ=="combined")?"total_tr":organ; // The name of the "all organs" field in this TSV
	counts2019 = counts2019.map(function(x){return x[data_key];});
	counts2020 = counts2020.map(function(x){return x[data_key];});

	var count2019 = d3.sum(counts2019);
	var count2020 = d3.sum(counts2020);

	//DEBUG
	/*
	console.log("region = ", region);
	console.log("organ = ", organ);
	console.log("total_data = ", total_transplants_data);
	console.log("counts2019 = ", counts2019);
	console.log("counts2020 = ", counts2020);
	console.log("count2019 = ", count2019);
	console.log("count2020 = ", count2020);
	*/
        //console.log(total_transplants_data);

        //console.log("region = ", region);
        var max_y = total_transplants_region_max[region] ;
        //console.log("max_y = ", max_y);

        update_bar_chart(count2019,count2020,max_y);
    }


    function adjust_data_types()
    {
        // Need just once, convert the numeric fields to javascript floa
        // (from the default of "d3.tsv" to load as strings)
        data.forEach(function(x){
            x.avg_2019 = +x.avg_2019;
            x.avg_2020 = +x.avg_2020;
        });

        //DEBUG
        // console.log("transplant-plot data after type-adjustment:", data);

        covid_cases_data.forEach(function(x){
            x.date = x.date.replace("2020-","");
            x.count = +x.count;
        });
    }

    //From: https://stackoverflow.com/a/19691491
    function addDays(date, days) {
        var result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    function start_graph()
    {
        adjust_data_types();

        var base_date = new Date(2019,2,1); // 1-March-2019
        var dates = Array(50).fill(1).map(function(x,idx){
            var d = addDays(base_date, idx);
            return `${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
        });

        var fake_line = dates.map(function(date){ return { date:date,value:25 };});
        update_graph_axis_domains( [new Date(dates[0]), new Date(dates[49])],
                                   [0, 50], 0 );
        //update_graph([fake_line],false);

        setTimeout(update_graph_gui, 500);
    }


    function get_transplants_graph_data()
    {
        var donor_type = $("input[name='transplants_donor_type']:checked").val();

        //DEBUG
        //console.log("transplant-donor-type:", donor_type);

        var plot_data_filename = transplants_tsv_file.replace("DONOR_TYPE",donor_type);
	var total_counts_filename = total_transplants_tsv_file.replace("DONOR_TYPE",donor_type);

        //DEBUG
        //console.log("plot_data_filename:", plot_data_filename);
        //console.log("total_counts_filename:", total_counts_filename);

        d3.tsv(plot_data_filename, function(error,x) {
	    if (error) throw error;
            data = x ;
            //DEBUG
            //console.log("transplat-plot-data = ", data);

            d3.tsv(total_counts_filename, function(error,y) {
		if (error) throw error;
		        total_transplants_data = y ;

                var global_count = 0 ;
                var tmp = total_transplants_data.forEach(function(x){
                    var r = x["country"];
                    var v = parseInt(x["total_tr"]);
                    if (!(r in total_transplants_region_max)) {
                        total_transplants_region_max[r] = 0;
                    }
                    total_transplants_region_max[r] += v;
                    global_count += v ;
                });
                total_transplants_region_max["global"] = global_count ;
                //DEBUG
                //console.log("tmp = ", total_transplants_region_max);
		//DEBUG
		//console.log("total_transplants_data = ", total_transplants_data);

		start_graph();
	    });

        });
    }

    function reload_graph_data()
    {
        console.log("Reloading");
        get_transplants_graph_data();
    }


    $(function(){
        create_graph();
        create_bar_graph();

        d3.tsv(covid_cases_tsv_file, function(x2) {
            if (!x2) {
                console.log("ERROR: failed to get " + covid_cases_tsv_file);
            }
            covid_cases_data = x2 ;

            //DEBUG:
            //console.log(covid_cases_data);

            //Attach onchange event to relevant HTML elements.
            $(data_attr_update).change(update_graph_gui);

            //The Deceased/Living needs reloading of the data
            $("[data-update='transplants-plot-reload']").change(reload_graph_data);

            get_transplants_graph_data();
        });
    });
})();
