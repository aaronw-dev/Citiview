const accessToken = "pk.eyJ1IjoiYXdkZXYiLCJhIjoiY2xyY3ZkazJqMTNoaTJpc3I2dDAyY2l2eiJ9.tR2w-nBDeG4c8RmntErT2Q";
const debug = false;

var typingTimer;
var doneTypingInterval = 500;

window.addEventListener("load", (event) => {
    init()
});
async function fetchGeocode(query) {
    const url = `https://api.locationiq.com/v1/autocomplete?key=pk.ecebeee654b3975a6a6fe684cfd4c686&q=${encodeURIComponent(query)}&limit=5&countrycodes=ca,us`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}
async function fetchEvents() {
    const url = `/data`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
}
function calculateZoomLevel(boundingBox, mapWidth, mapHeight) {
    const WORLD_DIM = { width: 256, height: 256 };
    const ZOOM_MAX = 21;
    const latRange = boundingBox[1] - boundingBox[0];
    const lonRange = boundingBox[3] - boundingBox[2];
    function latToPixel(lat) {
        return WORLD_DIM.height / 2 / Math.PI * Math.log((1 + Math.sin(lat * Math.PI / 180)) / (1 - Math.sin(lat * Math.PI / 180)));
    }
    function lonToPixel(lon) {
        return WORLD_DIM.width / 360 * (lon + 180);
    }
    const mapHeightAtZoom0 = latToPixel(boundingBox[1]) - latToPixel(boundingBox[0]);
    const mapWidthAtZoom0 = lonToPixel(boundingBox[3]) - lonToPixel(boundingBox[2]);
    const heightScale = mapHeight / mapHeightAtZoom0;
    const widthScale = mapWidth / mapWidthAtZoom0;
    const scale = Math.min(heightScale, widthScale);
    const zoomLevel = Math.floor(Math.log2(scale)) - 1;
    return Math.min(Math.max(zoomLevel, 0), ZOOM_MAX);
}
async function init() {
    const resultsContainer = document.querySelector(".results")
    const searchContainer = document.querySelector(".searchbar")
    const searchInput = document.querySelector("#search")

    const addDialog = document.querySelector("#add-dialog")
    const addTitle = document.querySelector("#add-title")
    const addDescription = document.querySelector("#add-description")
    const addPriority = document.querySelector("#add-priority")

    const addAccept = document.querySelector("#add-accept")
    const addCancel = document.querySelector("#add-cancel")

    const popupDialog = document.querySelector("#popup-dialog")
    const popupTitle = document.querySelector("#popup-title")
    const popupDescription = document.querySelector("#popup-description")
    const popupPriority = document.querySelector("#popup-priority")
    const popupDateTime = document.querySelector("#popup-time")

    var isAddDialogOpen = false;
    var isPopupOpen = false;

    searchInput.addEventListener("focus", e => {
        searchContainer.style.borderRadius = "20px 20px 0px 0px"
        resultsContainer.style.display = "flex"
    })
    searchInput.addEventListener("blur", e => {
        setTimeout(e => {
            searchContainer.style.borderRadius = "20px 20px 20px 20px"
            resultsContainer.style.display = "none"
        }, 200)
    })
    if (debug)
        return

    mapboxgl.accessToken = accessToken;
    var map = await new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/awdev/cm06wp98m00lf01pnhjvt49pn',
        dragRotate: false, center: [-123.017923, 49.177566],
        zoom: 10.4,
        pitch: 0,
    });
    function filterPlaces(dataArray, allowedOsmTypes) {
        const seenPlaces = new Set();

        return dataArray.filter(item => {
            if (allowedOsmTypes.includes(item.osm_type) && !seenPlaces.has(item.display_place)) {
                seenPlaces.add(item.display_place);
                return true;
            }
            return false;
        });
    }
    searchInput.addEventListener('keyup', function () {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(function (e) {
            if (!(!searchInput.value || searchInput.value == undefined)) {
                fetchGeocode(searchInput.value).then(data => {
                    console.log(data)
                    const osmTypes = ["node", "way", "relation", "area"];
                    data = filterPlaces(data, osmTypes)
                    for (let i = 0; i < 5; i++) {
                        resultsContainer.children[i].style.display = "none"
                    }
                    if (data.length > 0) {
                        for (let i = 0; i < data.length; i++) {
                            const element = data[i];
                            resultsContainer.children[i].style.display = "flex"
                            let targetResult = resultsContainer.children[i].children[1]
                            let propername = element.address.name + ((element.address.state != undefined) ? (", " + element.address.state) : "")
                            resultsContainer.children[i].onclick = function (e) {
                                searchInput.value = propername
                                map.flyTo({
                                    center: [element.lon, element.lat],
                                    zoom: calculateZoomLevel(element.boundingbox, window.innerWidth, window.innerHeight),
                                    speed: 0.2,
                                    curve: 1,
                                    duration: 2000,
                                    easing(t) {
                                        return t;
                                    }
                                });
                            }
                            targetResult.innerText = propername
                        }
                    }
                });
            }
        }, doneTypingInterval);
    });
    searchInput.addEventListener('keydown', function () {
        clearTimeout(typingTimer);
    });
    function addMarkerAtPos(coords, color) {
        let el = document.createElement('div');
        let height = 10;
        let width = height;
        el.className = 'marker';
        el.style.backgroundColor = color
        el.style.borderRadius = "50%"
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;
        el.style.cursor = 'pointer';
        userMarker = new mapboxgl.Marker({ element: el, anchor: "center" })
            .setLngLat(coords)
            .addTo(map);
        return userMarker
    }


    let eventData = await fetchEvents()
    var addEventMarker;
    var selectedMarker;
    function hideAddDialog() {
        addDialog.style.display = "none"
        if (addEventMarker) {
            addEventMarker.remove();
            addEventMarker = null
        }
        isAddDialogOpen = false;
        map.setMinZoom(0)
        map.stop()
    }
    async function submitEvent() {
        let markerPosition = addEventMarker.getLngLat()
        const response = await fetch('/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "description": addDescription.value,
                "title": addTitle.value,
                "position": [markerPosition.lng, markerPosition.lat],
                "priority": addPriority.value
            })
        });
        addDescription.value = ""
        addTitle.value = ""
        addPriority.value = 0.5
        if (response.ok) {
            console.log("Item was submitted successfully.");
            eventData = await fetchEvents()
            map.getSource('events').setData(eventData);
        } else {
            console.error("Failed to submit the item.");
        }
    }
    addAccept.onclick = function (e) {
        let marker = addMarkerAtPos(addEventMarker.getLngLat(), "#68e88a");
        submitEvent();
        hideAddDialog();
    };
    addCancel.onclick = function (e) {
        hideAddDialog();
    };
    function openPopup(title, description, priority, datetime) {
        popupDialog.style.display = "flex"
        popupTitle.innerHTML = title
        popupDescription.innerHTML = description
        popupPriority.value = priority
        popupDateTime.innerHTML = datetime
    }
    map.on('load', () => {
        map.addSource('events', {
            type: "geojson",
            data: eventData
        });
        map.addLayer(
            {
                'id': 'earthquakes-heat',
                'type': 'heatmap',
                'source': 'events',
                'maxzoom': 17,
                'paint': {
                    // Increase the heatmap weight based on frequency and property magnitude
                    'heatmap-weight': [
                        'interpolate',
                        ['linear'],
                        ['get', 'priority'],
                        0,
                        0,
                        1,
                        1
                    ],
                    // heatmap-intensity is a multiplier on top of heatmap-weight
                    'heatmap-intensity': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        0,
                        3,
                        9,
                        3
                    ],
                    // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
                    'heatmap-color': [
                        'interpolate',
                        ['linear'],
                        ['heatmap-density'],
                        0,
                        'rgba(0, 0, 255, 0)',
                        0.2,
                        'rgba(0, 0, 255, 0.2)',
                        0.4,
                        'rgba(34, 45, 255, 1)',
                        0.6,
                        'rgba(79, 250, 79, 1)',
                        0.8,
                        'rgba(255, 255, 67, 1)',
                        1,
                        'rgba(255, 27, 27, 1)'
                    ]
                    ,
                    // Adjust the heatmap radius by zoom level
                    'heatmap-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        1,
                        0,
                        13,
                        40
                    ]
                }
            },
            'waterway-label'
        );
        eventData.features.forEach(feature => {
            let marker = addMarkerAtPos(feature.geometry.coordinates, "white")
            marker._element.addEventListener("click", (e) => {
                selectedMarker = marker
                openPopup(feature.properties.title, feature.properties.description, feature.properties.priority, feature.properties.datetime)
                let markerPosition = map.project(selectedMarker.getLngLat())
                popupDialog.style.left = markerPosition.x + "px"
                popupDialog.style.top = markerPosition.y + "px"
                setTimeout(() => {
                    isPopupOpen = true
                }, 10);
            })
        });
    })
    map.on('click', (e) => {
        isAddDialogOpen = !isAddDialogOpen;
        if (isAddDialogOpen && !selectedMarker) { // when the dialog is shown on screen
            if (addEventMarker == undefined) {
                addEventMarker = addMarkerAtPos(e.lngLat, "#3898ff")
            } else {
                addEventMarker.setLngLat(e.lngLat)
            }
            addDialog.style.display = "flex"
            let eventMarkerPosition = map.project(addEventMarker.getLngLat())
            addDialog.style.left = eventMarkerPosition.x + "px"
            addDialog.style.top = eventMarkerPosition.y + "px"
            map.flyTo({
                center: e.lngLat,
                zoom: 18,
                duration: 1000,
            })
        } else { // when the dialog is hidden
            hideAddDialog()
        }
        if (selectedMarker && isPopupOpen) {
            selectedMarker = null
            isPopupOpen = false
            popupDialog.style.display = "none"
        }
    });

    map.on('move', () => {
        if (addEventMarker) {
            let eventMarkerPosition = map.project(addEventMarker.getLngLat())
            addDialog.style.left = eventMarkerPosition.x + "px"
            addDialog.style.top = eventMarkerPosition.y + "px"
        }
        console.log(selectedMarker);
        if (selectedMarker) {
            let markerPosition = map.project(selectedMarker.getLngLat())
            popupDialog.style.left = markerPosition.x + "px"
            popupDialog.style.top = markerPosition.y + "px"
        }
    });
}