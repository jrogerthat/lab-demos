async function loadData(file, type) {
  return await d3[type](file);
}

let mapPath = "https://gist.githubusercontent.com/jrogerthat/13d202baa32e3f40935fd821a53a2473/raw/5b6e885727ccc290d0f62fa9c5fa69e81db6cf37/geojson-us.json";
let ufoPath = "https://gist.githubusercontent.com/jrogerthat/d268681ca1aa08f1550b8fd128865eef/raw/af4dfd3b11040dc3f4296c9138b562445e969841/ufo-sample-data";
let stateDictPath =
 "https://gist.githubusercontent.com/jrogerthat/f77b7c28dce15b893e0fe5cb6dd16d55/raw/f1a9e22ba1e777d6ed8b0d749b3fcc3118856cfe/state-dictionary.json";

loadData(mapPath, "json").then(async mapData => {
  //console.log('map',mapData);

  let ufoData = await loadData(ufoPath, "csv");

  //We have a sample of global UFO sightings. We just want the US.
  let usUFOData = ufoData.filter(f => f.country === "us");

  let stateDict = await loadData(stateDictPath, "json");

  let newMapData = mapData.features.map((state, i) => {

    let abb = stateDict[state.properties.name]
      ? stateDict[state.properties.name].toLowerCase()
      : null;

    let stateUFO = usUFOData.filter(f => f.state === abb);
    state.properties.ufos = stateUFO;
    return state;
  });

  let button = renderButton(d3.select("#button-wrap"), "Tell A Story");
  
  let svg = d3.select("svg");
  svg.attr("width", 1000);
  svg.attr("height", 600);

  let projection = d3
    .geoAlbersUsa()
    .translate([500, 300]) // this centers the map in our SVG element
    .scale([1200]);

  drawMap(svg, projection, mapData);
  drawMarkers(svg, projection, usUFOData);

  button.on('click', ()=>{
   let circles = d3.select('#markerLayer').selectAll('circle');
    highlightData(usUFOData, circles)
    
  });
});

function drawMap(svg, projection, mapData) {
  const tooltip = d3.select("#tooltip");

  svg.append("g").attr("id", "mapLayer");

  // Define a quantized scale to sort data values into buckets of color
  let color = d3
    .scaleQuantize()
    .range(["#D5D8DC", "#808B96", "#2C3E50", "#212F3D", "#17202A"]);

  // Set input domain for color scale based on the min and max
  console.log(mapData.features.map(m => m.properties.ufos.length));
  let min = d3.min(mapData.features.map(m => m.properties.ufos.length));
  let max = d3.max(mapData.features.map(m => m.properties.ufos.length));
  color.domain([min, max]);

  // This converts the projected lat/lon coordinates into an SVG path string
  let path = d3.geoPath().projection(projection);

  // Bind data and create one path per GeoJSON feature
  d3.select("#mapLayer")
    .selectAll("path")
    .data(mapData.features)
    .join("path")
    // here we use the familiar d attribute again to define the path
    .attr("d", path)
    .style("fill", function(d) {
      return color(d.properties.ufos.length);
      //return d.properties.ufos.length === 0
      //  ? "red"
      //  : color(d.properties.ufos.length);
    })
    .on("mouseover", function(d, i) {
      tooltip
        .transition()
        .duration(200)
        .style("opacity", 1);
      tooltip
        .html(stateToolTipRender(d.properties))
        .style("left", `${d3.event.pageX}px`)
        .style("top", `${d3.event.pageY}px`);
    })
    .on("mouseleave", function(d, i) {
      tooltip
        .transition()
        .duration(500)
        .style("opacity", 0);
    });
}

function drawMarkers(svg, projection, ufoData) {
  const tooltip = d3.select("#tooltip");

  let circleScale = d3
    .scaleLinear()
    .domain([
      d3.min(ufoData, d => d.duration),
      d3.max(ufoData, d => d.duration)
    ])
    .range([2, 7])
    .clamp(true);

  let markerLayer = svg.append("g").attr("id", "markerLayer");

  markerLayer
    .selectAll("circle")
    .data(ufoData)
    .join("circle")
    .attr("cx", function(d) {
      return projection([d.longitude, d.latitude])[0];
    })
    .attr("cy", function(d) {
      return projection([d.longitude, d.latitude])[1];
    })
    .attr("r", d => circleScale(d.duration))
    .style("fill", "#01FB86")
    .on("mouseover", function(d, i) {
      console.log(d);
      tooltip
        .transition()
        .duration(200)
        .style("opacity", 1);
      tooltip
        .html(locationToolTipRender(d))
        .style("left", `${d3.event.pageX}px`)
        .style("top", `${d3.event.pageY}px`);
    })
    .on("mouseleave", function(d, i) {
      tooltip
        .transition()
        .duration(500)
        .style("opacity", 0);
    });
}

function stateToolTipRender(data) {
  let text = `<h2>${data.name}</h2 <div>${
    data.ufos.length > 0
      ? `${Math.round(
          d3.sum(data.ufos.map(u => u.duration)) / data.ufos.length,
          2
        )} sec`
      : "0 sec"
  }</div>
  <div>
${
  data.ufos.length > 0
    ? data.ufos.length > 1
      ? `${data.ufos.length} times`
      : `${data.ufos.length} time`
    : `None`
}
</div>
`;
  return text;
}

function locationToolTipRender(data) {
  return `
<h2 class="city">${data.city.toUpperCase()}</h2>
<div>Time: ${data.datetime}</div>
<div>Duration: ${data["duration (hours/min)"]}</div>
<div>${data.comments}</div>
`;
}

//NEW THINGS//
function renderButton(div, labelText) {
  let button = div.append("button").text(labelText);
  button.classed("btn btn-outline-primary", true);
  button.style("margin-left", "20px");

  return button;
}

function highlightData(data, circles){
  
   let paneWrap = d3.select('body').append('div').attr('class', 'pane')
   let pane = paneWrap.append('svg');
  let rect = pane.append('rect')
    .classed('pane-rect', true)
    .attr('opacity', 0)
    .transition()
    .delay(500).attr('opacity', 0.5);
    ///
   let cityGroups = d3.groups(data, d=> d.city); 
   let maxCity = d3.max(d3.groups(data, d=> d.city).map(m=> m[1].length));
  
    // Cities with the most sightings
  let cities = cityGroups.filter(f=> f[1].length === maxCity);
  
  let cityCircles = circles.filter(c=> {
    return cities.map(m=> m[0]).indexOf(c.city) > -1;
  });
  
  cityCircles.attr('fill', 'red')
  
  let cityPositions = []
      
  cityCircles.each((c, i, n)=> {
    cityPositions.push({'name': c.city, 'position': [n[i].getBoundingClientRect().x, n[i].getBoundingClientRect().y]})        
  });
  
  let highlightG = pane.selectAll('g.highlight').data(d3.groups(cityPositions, d=> d.name)).join('g').classed('highlight', true);
  
  highlightG.attr('transform', d=> `translate(${d[1][0].position[0]}, ${d[1][0].position[1]})`);
  
  highlightG.append('line')
    //.attr('opacity', 0)
    .attr('x1', 3)
    .attr('x2', 3)
    //.attr('x2', d=> d[1][0].position[0])
    .attr('y1', 0)
    .attr('y2', -50)
    .attr('stroke', 'black')
    .attr('stroke-width', 1)
    .attr('opacity', 0)
    .transition()
    .delay(500).attr('opacity', 1);

  highlightG.append('rect')
    .attr('width', 150)
    .attr('height', 50)
    .attr('y', -100)
    .attr('fill', '#fff')
    .attr('opacity', 0)
    .transition()
    .delay(500).attr('opacity', 1);

  let textGroup = highlightG.append('g').attr('transform', `translate(6, -80)`)
  
  textGroup.attr('opacity', 0)
  .transition()
  .delay(500).attr('opacity', 1);

  textGroup.append('text').text(d=> `${d[0].charAt(0).toUpperCase() + d[0].slice(1)}`).classed('title', true);

  textGroup.append('text').text(d=> `had ${d[1].length} UFO sightings`).attr('y', 20);

    pane.on('click', function(){
        paneWrap.remove();
    });
}


