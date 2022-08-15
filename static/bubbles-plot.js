"use strict";

;(function(){
    /* Configuration values */

    /* Hardcoded at the moment */
    const last_animation_day = 306 ;

    // Set the dimensions of the plot (in pixels)
    const plot_width = 700;
    const plot_height = 400;
    const margin = {top: 30, right: 40, bottom: 50, left: 60};

    // The "id=" value of the HTML element in which to create the plot.
    const id_bubbles_plot = "bubbles_graph";

    // The "id=" value of the HTML element in which to create the plot legend
    const id_bubbles_legend = "bubbles_legend_table";

    // HTML element with the attribute:
    //      data-update="transplants-plot"
    // will be automatically gain an "onchage" event that will refresh this plot.
    const data_attr_update = "[data-update='bubbles-plot']";

    const yaxis_label = "Overall diminution of transplants compared to 2019 (%)" ;
    const xaxis_label = "COVID-19 deaths per Million (at the end of follow-up)" ;
    const yaxis2_label = "COVID Cases" ;

    const bubble_colors_by_continent_values = {
        "South America" : "#B0CDFF",
        "North America" : "#7FDC9B",
        "Europe"        : "#FBBAB6",
        "Asia"          : "#98ac23",
        "Africa"        : "#54C3E2",
        "Australia"     : "#c4ed13"
    };

    const country_to_continent = {
        "Argentina": "South America",
        "Australia": "Australia",
        "Austria": "Europe",
        "Belgium": "Europe",
        "Brazil": "South America",
        "Canada": "North America",
        "Chile": "South America",
        "Croatia": "Europe",
        "Finland": "Europe",
        "France": "Europe",
        "Germany": "Europe",
        "Greece": "Europe",
        "Hungary": "Europe",
	"Japan": "Asia",
	"Ireland": "Europe",
        "Italy": "Europe",
	"Kuwait": "Asia",
	"Myanmar": "Asia",
	"Malaysia": "Asia",
        "Netherlands": "Europe",
        "Norway": "Europe",
	"Paraguay": "South America",
        "Portugal": "Europe",
        "Slovenia": "Europe",
        "Spain": "Europe",
        "Switzerland": "Europe",
        "United Kingdom": "Europe",
        "US": "North America",
    };

    const bubble_colors_by_country_values = {
        "Argentina" : "#a6cee3",
        "Australia" : "#543215",
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
	"Ireland"   : "#00ff7f",
        "Italy"     : "#fdbf6f",
	"Kuwait"    : "#8b0000",
	"Japan"     : "#778899",
	"Malaysia"  : "#C1C1C1",
        "Netherlands":"#e45f98",
        "Norway"    : "#2167a3",
	"Paraguay"  : "#1e90ff",
        "Portugal"  : "#ff7f00",
        "Slovenia"  : "#32afce",
        "Spain"     : "#cab2d6",
        "Switzerland" : "#6a3d9a",
        "United Kingdom" : "#cc5500",
        "US"        : "#f5f5f5",
    };

    /*bubble size needs to be updated to include deceased only*/
    const bubbles_tsv_file = "/static/bubbles-plot.DONOR_TYPE.tsv";
    const bubbles_tr_counts_tsv_file = "/static/bubble-size.deceased-living.tsv";
    /*TODO: add error message if file not found
    /* Don't change things below this point */

    if ('undefined' === typeof jQuery) {
        console.log("bubbles-plot.js: error: jQuery not loaded");
    }
    if ('undefined' === typeof d3) {
        console.log("bubbles-plot.js: error: d3 not loaded");
    }

    var max_date;
    var animation_active = false;
    var date_slider;

    var data;
    var transplant_counts_data;
    var max_transplant_count = 0;

    //D3 Globals :(
    var x,y,xAxis,yAxis,x_gridlines,y_gridlines, svg, tooltip_div;
    var y2, yAxis2;
    var bubble_size_scale;
    var bubble_color_function = bubble_color_by_continent;
    var covid_curve_line;

    function bubble_color_by_continent(d) {
        return bubble_colors_by_continent_values[
            country_to_continent[d.country]
        ] || "gray";
    };

    function bubble_color_by_country(d) {
        return bubble_colors_by_country_values[d.country] || "gray";
    }

    function bubble_create_graph()
    {
        // Set the dimensions of the canvas / graph
        const width = plot_width - margin.left - margin.right;
        const height = plot_height - margin.top - margin.bottom;

        // Adds the svg canvas
        svg = d3.select("#" + id_bubbles_plot)
            .append("svg")
              .classed("bubbles-plot", "true")
              .classed("svg-content", "true")
              .attr("preserveAspectRatio", "xMinYMin meet")
              .attr("viewBox", "0 0 " + plot_width + " " + plot_height)
            .append("g")
              .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

        // Create the X and Y axis scales
        x = d3.scaleLinear()
            .range([ 0, width ]);
        y = d3.scaleLinear()
            .range([ height, 0]);
        y2 = d3.scaleLinear()
            .range([ height, 0]);

        // Map the logical size (the "sum_tr" value) to a graph-scale (5 to 300)
        bubble_size_scale = d3.scaleLinear().range([5, 50]);

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
                  (height + margin.top + 10) + ")")
            .style("text-anchor", "middle")
            .text(xaxis_label);

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
            .text(yaxis_label);

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

/*        // Add second Y axis
        yAxis2 = d3.axisRight(y2);

        svg.append("g")
            .attr("id","y-axis2")
            .attr("transform","translate(" + width + ",0)")
            .call(yAxis2);

        // text label for the second y axis
        svg.append("text")
            .attr("id","yaxis2-label")
            .attr("transform", "rotate(90)")
            .attr("y", -width - margin.right)
            .attr("x",0 + (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text(yaxis2_label);
*/

        // Define the div for the tooltip
        tooltip_div = d3.select("body").append("div")
            .attr("class", "bubbles-plot-tooltip")
            .style("opacity", 0)
            .html("");


        // Add the "COVID CURVE" - There is only a single curve,
        // So create a dedicated variable for it instead of using ".Selectall()".
        covid_curve_line = svg.append("line")          // attach a line
            .attr("class","curve")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", 0);
    }

    function bubble_update_graph_axis_domains(xrange, yrange, animation_duration)
    {
        x.domain(xrange);
        y.domain(yrange);
        y2.domain([0,100]);

        // Update X axis
        svg.select("#x-axis")
            .transition()
            .duration(animation_duration)
            .call(xAxis);

        // Update X axis Gridlines
        svg.select("#x-axis-gridlines")
            .transition()
            .duration(animation_duration)
            .call(x_gridlines);

        // Update Y axis
        svg.select("#y-axis")
            .transition()
            .duration(animation_duration)
            .call(yAxis);

        // Update Y axis Gridlines
        svg.select("#y-axis-gridlines")
            .transition()
            .duration(animation_duration)
            .call(y_gridlines);

/*
        // Update second Y axis
        svg.select("#y-axis2")
            .transition()
            .duration(animation_duration)
            .call(yAxis2);
*/

        // Now that the
        covid_curve_line
            .attr("x1", x(0))
            .attr("y1", y(0))
            .attr("x2", x(xrange[1]))
            .attr("y2", y(yrange[1]));
    }

    function bubble_update_graph(data)
    {
        var rejoin = svg.selectAll("circle")
            .data(data, function(d){
                return d.country;
            }) ;

        var bubbles = rejoin.enter().append("circle")
            .attr("cx", x(0))
            .attr("cy", y(0))
            .merge(rejoin);

        bubbles.transition()
            .duration(500)
            .attr("cx", function(d) { return x(d.covid_death_per_mill); })
            .attr("cy", function(d) { return y(d.selected_organ_smooth_rate); })
            .attr("r",  function(d) { return bubble_size_scale(d.selected_organ_sum_tr); })
            .attr("stroke", "black")
            .attr("fill", bubble_color_function)
            .attr("opacity", 0.5);

        bubbles.on("mouseover", function(d) {
            console.log("mouse over", d);
            tooltip_div.transition()
                .duration(200)
                .style("opacity", .9);
            var txt = d.country + "<br/>" +
                d.covid_death_per_mill.toFixed(2) + " COVID-19 deaths/million<br/>" +
                d.selected_organ_smooth_rate.toFixed(2) + "% diminution of transplants<br/>";
            tooltip_div.html(txt)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
            .on("mouseout", function(d) {
                console.log("mouse out");
                tooltip_div.transition()
                    .duration(500)
                    .style("opacity", 0);
            });


        rejoin.exit()
            .transition()
            .duration(500)
            .remove();

        //console.log("bubble data to plot = ", data);

        /* Bubble Static Labels */
        /**/
        var rejoin2 = svg.selectAll("text.bubble_label")
            .data(data, function(d){
                return d.country;
            }) ;

        var bubble_labels = rejoin.enter().append("text")
            .attr("class","bubble_label")
            .attr("x", x(0))
            .attr("y", y(0))
            .merge(rejoin2);

        bubble_labels.transition()
            .duration(500)
            .attr("text-anchor","middle")
            .attr("x", function(d) { return x(d.covid_death_per_mill); })
            .attr("y", function(d) { return y(d.selected_organ_smooth_rate) -
                                     bubble_size_scale(d.selected_organ_sum_tr)/2 - 10; })
            .text(function(d){return d.country;})
            .attr("font-size","10px")
            .attr("fill", bubble_color_function)
            .attr("opacity", 1);

       rejoin2.exit()
            .transition()
            .duration(500)
            .remove();
    }



    function bubble_update_graph_gui()
    {
        var color_by = $("input[name='bubble_color_by']:checked").val();
        var date = date_slider.slider('getValue');
        date = +date ;
        var organ = $("input[name='bubble_organ']:checked").val();
        //console.log("selected organ = ", organ);

        var labels;
        var label_colors;
        var all = data ;
        var day_date = data.filter(function(x){ return x.date_period == date; });
        if (color_by == "country") {
            bubble_color_function = bubble_color_by_country;
            labels = new Set(day_date.map(function(x){return x.country;}));
            label_colors = bubble_colors_by_country_values;
        } else {
            bubble_color_function = bubble_color_by_continent;
            labels = new Set(day_date.map(function(x){return country_to_continent[x.country];}));
            label_colors = bubble_colors_by_continent_values;
        }

        // Keep the data of the selected organ
        day_date.forEach(function(x){
            if (organ == "kidney") {
                x.selected_organ_smooth_rate = x.kidney_smooth_rate ;
            } else if (organ == "lung") {
                x.selected_organ_smooth_rate = x.lung_smooth_rate ;
            } else if (organ == "heart") {
                x.selected_organ_smooth_rate = x.heart_smooth_rate ;
            } else if (organ == "liver") {
                x.selected_organ_smooth_rate = x.liver_smooth_rate ;
            } else if (organ == "combined") {
                x.selected_organ_smooth_rate = x.total_smooth_rate ;
            }
            if (x.country in transplant_counts_data) {
                x.selected_organ_sum_tr = transplant_counts_data[x.country][organ] ;
            } else {
                console.log("BUBBLE-PLOT ERROR: country",x.country," not in transplant-counts");
            }
        });

        //console.log("date = ", date);
        //console.log("day_date = ", day_date);

        // Update Legend
        var tbl = $("#" + id_bubbles_legend);
        tbl.empty();
        labels.forEach(function(name,idx){
            //console.log("label = ", name);
            var clr = label_colors[name];
            tbl.append(`<tr><td class="bubbles_legend_square" style="background-color: ${clr}"</td><td style="color: ${clr}">${name}</td></tr>`);
        });

        //Turn off animation by default
        animation_active = false;

        bubble_update_graph(day_date);
    }


    function bubble_adjust_data_types()
    {
        //console.log("Adjust data: before: ", data);

        // Need just once, convert the numeric fields to javascript float
        // (from the default of "d3.tsv" to load as strings)
        data.forEach(function(x){
            //x.date = +x.date;
            x.date_period = +x.date_period;
            x.covid_cases = +x.covid_cases;
            x.covid_death = +x.covid_death;
            x.pop_per_mill = +x.pop_per_mill;
            x.covid_death_per_mill = +x.covid_death_per_mill;
            x.kidney_smooth_rate = +x.kidney_smooth_rate;
            x.liver_smooth_rate = +x.liver_smooth_rate;
            x.lung_smooth_rate = +x.lung_smooth_rate;
            x.heart_smooth_rate = +x.heart_smooth_rate;
            x.total_smooth_rate = +x.total_smooth_rate;
        });
        //console.log("Adjust data: after: ", data);
    }

    function bubbles_adjust_transplant_counts_data_type()
    {
        //console.log("Adjust transplant count data: before: ", transplant_counts_data);
        transplant_counts_data.forEach(function(x){
            x.population = +x.population;
            x.kidney = +x.kidney;
            x.liver = +x.liver;
            x.heart = +x.heart;
            x.lung = +x.lung;
            x.sum = +x.sum;
        });
        //console.log("Adjust transplant count data: after: ", transplant_counts_data);

        //Convert the transplants counts to hash-of-hash structure
        var tmp = {};
        transplant_counts_data.forEach(function(x){
            tmp[x.country] = {
                "kidney": x.kidney,
                "liver" : x.liver,
                "heart" : x.heart,
                "lung"  : x.lung,
                "combined" : x.sum
            };
            max_transplant_count = Math.max(max_transplant_count, x.sum);
        });
        //console.log("converted transplants-count = ", tmp);
        transplant_counts_data = tmp ;
    }

    function bubble_animation_stop()
    {
        animation_active = false;
        console.log("animation completed");
        //Set the button to show the "PLAY/PAUSE" icon
        //$("#bubble_day_animate_btn").html("&#x23EF;");
        $("#bubble_day_animation_play_btn").toggleClass('d-none');
        $("#bubble_day_animation_pause_btn").toggleClass('d-none');
    }

    function bubble_animation_step()
    {
        if (!animation_active) {
            console.log("animation not active - stopping");
            return ;
        }

        var date = date_slider.slider('getValue');
        //console.log("date = ",date, " max_date = ", max_date);
        if (date >= max_date) {
            bubble_animation_stop();
            return ;
        }

        date = parseInt(date)+1;
        //console.log("advancing animation to day ", date);
        $("#bubble_day_range").val(date);
        date_slider.slider('setValue', date);

        bubble_update_graph_gui();

        //Mark animation as active
        animation_active = true;

        setTimeout(bubble_animation_step, 300);
    }

    function start_bubble_animation()
    {
        if (animation_active) {
            bubble_animation_stop();
            return ;
        }

        // Set the button to show the "PLAY/PAUSE" icon
	    //$("#bubble_day_animate_btn").html("&#x23EF;");
        $("#bubble_day_animation_play_btn").toggleClass('d-none');
        $("#bubble_day_animation_pause_btn").toggleClass('d-none');


        console.log("starting animation from button");
        animation_active = true ;
        setTimeout(bubble_animation_step, 300);
    }

    function bubble_start_graph()
    {
        bubble_adjust_data_types();

        var xrange = d3.extent(data, function(d){return d.covid_death_per_mill;});
        var yrange = [0,100]; // Percents

        console.log("xrange = ", xrange, "  yrange = ", yrange );
        bubble_update_graph_axis_domains(xrange, yrange, 0);

        // Set the bubble-size scaler, based on the min/max values
        var size_range = [0,max_transplant_count];
        //console.log("Bubble size range:", size_range);
        bubble_size_scale.domain(size_range);

        // Setup the Day/date range slider, using https://github.com/seiyria/bootstrap-slider
        var date_range = d3.extent(data, function(d){return d.date_period;})
        //date_range[0] = 0 ;
        //date_range[1] = 240;

        if (date_range[1] > last_animation_day) {
            date_range[1] = last_animation_day;
        }

        max_date = date_range[1];
        //console.log("date slider range:", date_range);


        var date_slider_data = {
            min: date_range[0],
            max: date_range[1],
            value: 0,
            tooltip: 'always',
            tooltip_position: 'bottom',
            ticks: date_range,
            ticks_labels: date_range,
            ticks_positions: [0,100,200,300,400]
        } ;
        date_slider = $("#bubble_day_range").slider(date_slider_data);
        console.log("date slider_data = ", date_slider_data);

        bubble_update_graph_gui();
    }



    function get_bubbles_graph_data()
    {
        var donor_type = $("input[name='bubble_donor_type']:checked").val();

        //DEBUG
        //console.log("bubble-donor-type:", donor_type);

        var filename = bubbles_tsv_file.replace("DONOR_TYPE",donor_type);

        //filename = "/static/bubbles-plot.tsv";

        //DEBUG
        //console.log("bubbles data filename:", filename);

        d3.tsv(filename, function(x) {
            //DEBUG
            //console.log("loaded BubblePlot data");
            //console.log("bubble data = ", x);

            data = x ;
            bubble_start_graph();
        });
    }

    function reload_graph_data()
    {
        console.log("Reloading bubble Graph DAta");
        get_bubbles_graph_data();
    }

    $(function(){
        //console.log("starting");

        bubble_create_graph();
        d3.tsv(bubbles_tr_counts_tsv_file, function(y) {
            //DEBUG
            //console.log("Got bubble-plot TR-counts data");

            transplant_counts_data = y ;
            bubbles_adjust_transplant_counts_data_type();

            //Attach onchange event to relevant HTML elements.
            $(data_attr_update).change(bubble_update_graph_gui);

            //Attach the "animate" button
            $("#bubble_day_animate_btn").click(start_bubble_animation);

            //The Deceased/Living needs reloading of the data
            $("[data-update='bubbles-plot-reload']").change(reload_graph_data);

            get_bubbles_graph_data();

        });
    })

})();
