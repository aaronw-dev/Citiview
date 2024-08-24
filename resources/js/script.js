const accessToken = "pk.eyJ1IjoiYXdkZXYiLCJhIjoiY2xyY3ZkazJqMTNoaTJpc3I2dDAyY2l2eiJ9.tR2w-nBDeG4c8RmntErT2Q";
const debug = false;

var typingTimer;
var doneTypingInterval = 500;

window.addEventListener("load", (event) => {
    init()
});
async function fetchGeocode(query) {
    const url = `https://api.locationiq.com/v1/autocomplete?key=pk.ecebeee654b3975a6a6fe684cfd4c686&q=${encodeURIComponent(query)}&limit=5&countrycodes=ca`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching geocode data:', error);
    }
}
function calculateZoomLevel(boundingBox, mapWidth, mapHeight) {
    const WORLD_DIM = { width: 256, height: 256 }; // Tile size in pixels at zoom level 0
    const ZOOM_MAX = 21;
    const latRange = boundingBox[1] - boundingBox[0]; // [minLat, maxLat]
    const lonRange = boundingBox[3] - boundingBox[2]; // [minLon, maxLon]
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
    const zoomLevel = Math.floor(Math.log2(scale));
    return Math.min(Math.max(zoomLevel, 0), ZOOM_MAX);
}
async function init() {
    const resultsContainer = document.querySelector(".results")
    const searchContainer = document.querySelector(".searchbar")
    const searchInput = document.querySelector("#search")

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
                            resultsContainer.children[i].onclick = function (e) {
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
                            targetResult.innerText = element.address.name + ((element.address.state != undefined) ? (", " + element.address.state) : "")
                        }
                    }
                });
            }
        }, doneTypingInterval);
    });
    searchInput.addEventListener('keydown', function () {
        clearTimeout(typingTimer);
    });
    async function addMarkerAtPos(coords, color) {
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
    }
    await addMarkerAtPos([-123.183728, 49.196103], "blue")
    await addMarkerAtPos([-123.17056967686463, 49.269096655191305], "green")
    await addMarkerAtPos([-123.07063662594405, 49.220854397413696], "purple")
}