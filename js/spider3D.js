let initLoad = true;

mapboxgl.accessToken = 'pk.eyJ1IjoiaW5nanVhbm1hc3VhcmV6IiwiYSI6ImNsZDZjMXJpYTFhdzgzdnBhZXdkczQxcnQifQ.25y1PWrOTW12YssZ73JQtA';
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v11",
  center: [-74.099274, 4.640518],
  zoom: 5,
  projection: "globe",
  maxZoom: 15,
  maxBounds: [
    [-3600, -80],
    [3600, 80],
  ],
});

map.on("load", () => {
  let airports;

  map.once("idle", () => {
    d3.json("./data/airports_world.json", function (d) {
      airports = d;
      getSpoke(airports);
    });

    map.on("move", () => {
      getSpoke(airports);
    });
  });
});

function getSpoke(airports) {
  const center = map.getCenter();
  const newPoint = turf.point([center.lng, center.lat]);
  buildSpoke(airports, newPoint);
}

function buildSpoke(airports, point) {
  let nearestAirports = turf.featureCollection([]);
  let nearestAirportLines = turf.featureCollection([]);
  let cleanedAirports = JSON.parse(JSON.stringify(airports));
  let startLng = point.geometry.coordinates[0];

  let buffCenter = turf.buffer(point, 50, { units: "kilometers" });
  turf.coordEach(
    buffCenter,
    function (
      currentCoord
    ) {
      if (startLng >= 90 && currentCoord[0] <= -90) {
        currentCoord[0] += 360;
      } else if (startLng <= -90 && currentCoord[0] >= 90) {
        currentCoord[0] -= 360;
      }
    }
  );

  for (let i = 1; i <= 8; i++) {
    const nearest = turf.nearestPoint(point, cleanedAirports);

    const endLng = nearest.geometry.coordinates[0];

    console.log("startlng", startLng);
    console.log("endLng", endLng);

    const nearestLine = turf.lineString([
      point.geometry.coordinates,
      nearest.geometry.coordinates,
    ]);

    console.log("point", point.geometry.coordinates);
    console.log("nearest", nearest.geometry.coordinates);

    let buffNearest = turf.buffer(nearest, 10, { units: "kilometers" });

    turf.coordEach(
      buffNearest,
      function (
        currentCoord
      ) {
        if (startLng >= 90 && currentCoord[0] <= -90) {
          currentCoord[0] += 360;
        } else if (startLng <= -90 && currentCoord[0] >= 90) {
          currentCoord[0] -= 360;
        }
      }
    );

    let buffNearestLine = turf.buffer(nearestLine, 10, {
      units: "kilometers",
    });

    turf.coordEach(
      buffNearestLine,
      function (
        currentCoord
      ) {
        if (startLng >= 90 && currentCoord[0] <= -90) {
          currentCoord[0] += 360;
        } else if (startLng <= -90 && currentCoord[0] >= 90) {
          currentCoord[0] -= 360;
        }
      }
    );

    nearestAirports.features.push(buffNearest);
    nearestAirportLines.features.push(buffNearestLine);

    const index = cleanedAirports.features.findIndex(
      (n) => n.properties.name === nearest.properties.name
    );
    if (index !== -1) {
      cleanedAirports.features.splice(index, 1);
    }
  }

  if (initLoad) {
    addLayers(airports, nearestAirports, nearestAirportLines, point);
  } else {
    map.getSource("newPoint").setData(nearestAirports);
    map.getSource("newLine").setData(nearestAirportLines);
    map.getSource("buffCenter").setData(buffCenter);
  }
}

function addLayers(airports, nearest, route, point) {
  initLoad = false;

  map.setFog({
    range: [0, 1],
    color: "#aaa",
    "horizon-blend": 1,
  });

  map.addSource("points", {
    type: "geojson",
    data: airports,
  });

  map.addSource("newPoint", {
    type: "geojson",
    data: nearest,
  });

  map.addSource("newLine", {
    type: "geojson",
    data: route,
  });

  map.addSource("buffCenter", {
    type: "geojson",
    data: point,
  });

  map.addLayer({
    id: "globe-points",
    type: "circle",
    source: "points",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        0.1,
        3,
        3,
      ],
      "circle-opacity": 1,
      "circle-blur": 0,
      "circle-color": "#555",
    },
  });

  map.addLayer({
    id: "globe-newPoint",
    type: "fill-extrusion",
    source: "newPoint",
    paint: {
      "fill-extrusion-color": "black",
      "fill-extrusion-height": 50000,
      "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.85,
    },
  });

  map.addLayer({
    id: "routePolyLayer",
    type: "fill-extrusion",
    source: "newLine",
    paint: {
      "fill-extrusion-color": "black",
      "fill-extrusion-height": 50000,
      "fill-extrusion-base": 30000,
      "fill-extrusion-opacity": 0.85,
    },
  });

  map.addLayer({
    id: "buffCenter",
    type: "fill-extrusion",
    source: "buffCenter",
    paint: {
      "fill-extrusion-color": "black",
      "fill-extrusion-height": 90000,
      "fill-extrusion-base": 25000,
      "fill-extrusion-opacity": 0.85,
    },
  });
}
