let initLoad = true;

mapboxgl.accessToken = 'pk.eyJ1IjoiaW5nanVhbm1hc3VhcmV6IiwiYSI6ImNsZDZjMXJpYTFhdzgzdnBhZXdkczQxcnQifQ.25y1PWrOTW12YssZ73JQtA';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-74.099274, 4.640518],
    zoom: 5,
    projection: "globe",
    maxZoom: 15,
});

map.on('load', () => {
    let airports;

    map.once('idle', () => {
        d3.json("./data/airports_world.json", function (d) {
            airports = d;
            getSpoke(airports);
        });

        // use mouse location
        // map.on('mousemove', (e) => {
        //     const newPoint = turf.point([e.lngLat.lng, e.lngLat.lat]);
        //     buildSpoke(airports, newPoint);
        // });

        // use map center
        map.on('move', () => {
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

    for (let i = 1; i <= 8; i++) {
        const nearest = turf.nearestPoint(point, cleanedAirports);
        const startLng = point.geometry.coordinates[0];
        const endLng = nearest.geometry.coordinates[0];
        
        if (startLng >= 90 && endLng <= -90) {
            nearest.geometry.coordinates[0] += 360;
        } else if (startLng <= -90 && endLng >= 90) {
            nearest.geometry.coordinates[0] -= 360;
        }

        console.log("startlng", startLng);
        console.log("endLng", endLng);

        const nearestLine = turf.lineString([point.geometry.coordinates, nearest.geometry.coordinates]);

        console.log("point", point.geometry.coordinates);
        console.log("nearest", nearest.geometry.coordinates);
        
        nearestAirports.features.push(nearest);
        nearestAirportLines.features.push(nearestLine);

        const index = cleanedAirports.features.findIndex(n => n.properties.name === nearest.properties.name)
        if (index !== -1) {
            cleanedAirports.features.splice(index, 1);
        }
    }

    if (initLoad) {
        addLayers(airports, nearestAirports, nearestAirportLines);
    } else {
        map.getSource('newPoint').setData(nearestAirports);
        map.getSource('newLine').setData(nearestAirportLines);
    }
}

function addLayers(airports, nearest, route) {
    initLoad = false;

    map.addSource('points', {
        'type': 'geojson',
        'data': airports
    });

    map.addSource('newPoint', {
        'type': 'geojson',
        'data': nearest
    });

    map.addSource('newLine', {
        'type': 'geojson',
        'data': route
    });

    map.addLayer({
        'id': 'routeLayer',
        'type': 'line',
        'source': 'newLine',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': 'red',
            'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                0.5,
                3,
                4
            ]
        }
    });

    map.addLayer({
        'id': 'globe-points',
        'type': 'circle',
        'source': 'points',
        'paint': {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                0.1,
                3,
                3
            ],
            'circle-opacity': 1,
            'circle-blur': 0,
            'circle-color': '#555'
        }
    });

    map.addLayer({
        'id': 'globe-newPoint',
        'type': 'circle',
        'source': 'newPoint',
        'paint': {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                0.25,
                3,
                4
            ],
            'circle-opacity': 1,
            'circle-blur': 0,
            'circle-color': 'red'
        }
    });
}
