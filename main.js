(function() {
  // Toggle active states of controls
  var $metrics = $('#controls .metric');
  $metrics.click(function() {
    var $clicked = $(this);
    $metrics.removeClass('active');
    $clicked.addClass('active');
    var selectedMetric = $clicked.data('metric');
    console.log('selectedMetric', selectedMetric);
    redraw(svg, selectedMetric);
  })
})();


var width = window.innerWidth,
    height = window.innerHeight,
    radius = Math.min(width, height) / 2,
    color = d3.scale.category20c();


var redraw = function(svg, metric) {
  var newArc = getArc(metric);
  svg.selectAll('g g path')
    .transition()
    .duration(800)
    .attr('d', newArc);
}

var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
    var str = '';
    str += d.parent && d.parent.name !== 'root' ? d.parent.name + ' > ' : '';
    str += d.name;

    return "<span>" +  str + "</span>";
  });

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height * .52 + ")");

svg.call(tip);

var partition = d3.layout.partition()
    .sort(null)
    .size([2 * Math.PI, radius * radius])
    .value(function(d) { return (+d.start) - +(d.end); });

var getOuterRadiusForTemperature = function(d) {
  const modernTemperature = 14.0;
  return (+d.parent.temperature - modernTemperature)*5000;
}

var getOuterRadiusForOxygen = function(d) {
  const modernOxygen = 20.0;
  return Math.abs(+d.parent.oxygen - modernOxygen)*5000;
}

var getOuterRadiusForCarbondioxide = function(d) {
  const modernCarbondioxide = 250;
  return Math.abs(+d.parent.carbondioxide - modernCarbondioxide)*10;
}

var getOuterRadiusForMetric = function(metric, d) {
  if (metric === 'temperature') {
    return getOuterRadiusForTemperature(d);
  } else if (metric === 'oxygen') {
    return getOuterRadiusForOxygen(d);
  } else if (metric === 'carbondioxide') {
    return getOuterRadiusForCarbondioxide(d);
  }
}

var getArc = function(metric) {
  metric = metric || 'temperature';
  var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { 
      return Math.sqrt(d.y * 0.1); 
    })
    .outerRadius(function(d) { 
      var result;
      if (d.type === 'epoch') {
        result = Math.sqrt(d.y * 0.1 + d.dy * 0.1 + getOuterRadiusForMetric(metric, d));
      } else {
        result = Math.sqrt(d.y * 0.1 + d.dy * 0.1);
      }
      return result;
    });
  return arc;
};



d3.json("gts-data.json", function(error, root) {
  if (error) throw error;

  var nodes = svg.datum(root).selectAll("g")
    .data(partition.nodes)
    .enter().append("g");

    nodes.append("path")
        .attr("display", function(d) { return d.depth ? null : "none"; }) // hide inner ring
        .attr("d", getArc())
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        .style("stroke", "#fff")
        .style("fill", function(d) { return color((d.children ? d : d.parent).name); })
        .style("fill-rule", "evenodd")
        .each(stash);
/*     nodes.append("text")
      .attr("x", function(d) { return d.depth - 3; })
      .attr("y", function(d) { return d.depth - 3; })
      .text(function(d) { return d.name; }); */


  d3.selectAll("input").on("change", function change() {
    var value = this.value === "count"
        ? function() { return 1; }
        : function(d) { return d.size; };

    path
        .data(partition.value(value).nodes)
      .transition()
        .duration(1500)
        .attrTween("d", arcTween);
  });
});

// Stash the old values for transition.
function stash(d) {
  d.x0 = d.x;
  d.dx0 = d.dx;
}

// Interpolate the arcs in data space.
function arcTween(a) {
  var i = d3.interpolate({x: a.x0, dx: a.dx0}, a);
  return function(t) {
    var b = i(t);
    a.x0 = b.x;
    a.dx0 = b.dx;
    return arc(b);
  };
}

d3.select(self.frameElement).style("height", height + "px");