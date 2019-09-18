async function loadData(file, type){
    return await d3[type](file);
}

let mapPath = 'https://gist.githubusercontent.com/jrogerthat/13d202baa32e3f40935fd821a53a2473/raw/5b6e885727ccc290d0f62fa9c5fa69e81db6cf37/geojson-us.json'
let ufoPath = 'https://gist.githubusercontent.com/jrogerthat/d268681ca1aa08f1550b8fd128865eef/raw/af4dfd3b11040dc3f4296c9138b562445e969841/ufo-sample-data'
let stateDictPath = 'https://gist.githubusercontent.com/jrogerthat/f77b7c28dce15b893e0fe5cb6dd16d55/raw/f1a9e22ba1e777d6ed8b0d749b3fcc3118856cfe/state-dictionary.json'

loadData(mapPath, 'json').then(async (mapData)=> {

    console.log(mapData);

    let ufoData = await loadData(ufoPath, 'csv');
   
    //We have a sample of global UFO sightings. We just want the US. 
    let usUFOData = ufoData.filter(f=> f.country === 'us');

    //Our new sample looks like this
    console.log('ufo',usUFOData);

    //But OH NO we only have the state abbreviations. How will we match the ufo data to the map data?
    //The internet has readily available abbreviation to state or state to abbreviation files. 
    //We are using one in json file format. It looks like this ->
    let stateDict = await loadData(stateDictPath, 'json');

    console.log(stateDict);

    let newMapData = mapData.features.map((state, i)=> {
    
        //We can use the dictionary to look up the right abbreviation and make it lower case if it's in the dict.
        //console.log(state.properties.name, stateDict[state.properties.name]);

        let abb = stateDict[state.properties.name] ? stateDict[state.properties.name].toLowerCase() : null;

        //Now we can filter by the US data to grab ufo data for each state
        //console.log('are we getting anything?', usUFOData.filter(f=> f.state === abb));

        let stateUFO = usUFOData.filter(f=> f.state === abb);

        state.properties.ufos = stateUFO;

        return state;
    });

    //console.log('we can look at the new property we added', newMapData);
    let svg = d3.select("svg");
    svg.attr('width', 1000);
    svg.attr('height', 1000);

    // In order to convert lat / lon (spherical!) coordinates to fit in the 2D
    // coordinate system of our screen, we need to create a projection function:
    // a USA-specific projection (that deals with Hawaii / Alaska)
    let projection = d3.geoAlbersUsa()
        .translate([500, 500]) // this centers the map in our SVG element
        .scale([700]);
        
    drawMap(svg, projection, mapData);
    drawMarkers(svg, projection, usUFOData);

});

function drawMap(svg, projection, mapData) {
    
    svg.append('g').attr('id', 'mapLayer');
    
     // Define a quantized scale to sort data values into buckets of color
     let color = d3.scaleQuantize()
     .range(["#D5D8DC","#808B96","#2C3E50","#212F3D","#17202A"]);

     // Set input domain for color scale based on the min and max
     console.log(mapData.features.map(m=> m.properties.ufos.length))
     let min = d3.min(mapData.features.map(m=> m.properties.ufos.length));
     let max = d3.max(mapData.features.map(m=> m.properties.ufos.length));
     color.domain([min, max]);
        
    // This converts the projected lat/lon coordinates into an SVG path string
    let path = d3.geoPath()
        .projection(projection);

    // Bind data and create one path per GeoJSON feature
    d3.select("#mapLayer").selectAll("path")
        .data(mapData.features)
        .join("path")
        // here we use the familiar d attribute again to define the path
        .attr("d", path)
        .style("fill", function (d) {
            //return color(d.properties.ufos.length);
            return d.properties.ufos.length === 0 ? 'red' : color(d.properties.ufos.length);
        });

    


}

function drawMarkers(svg, projection, ufoData){

    let circleScale = d3.scaleLinear()
    .domain([d3.min(ufoData, d => d.duration),
        d3.max(ufoData, d => d.duration)])
    .range([2, 7]).clamp(true);

    let markerLayer = svg.append('g').attr('id', 'markerLayer');

    markerLayer.selectAll("circle")
            .data(ufoData)
            .join("circle")
            .attr("cx", function (d) {
                return projection([d.longitude, d.latitude])[0];
            })
            .attr("cy", function (d) {
                return projection([d.longitude, d.latitude])[1];
            })
            .attr("r", d => circleScale(d.duration))
            .style("fill", '#01FB86');
           

}