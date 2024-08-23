const debug = true;
if (!debug) {
    mapboxgl.accessToken = 'pk.eyJ1IjoiYXdkZXYiLCJhIjoiY2xyY3ZkazJqMTNoaTJpc3I2dDAyY2l2eiJ9.tR2w-nBDeG4c8RmntErT2Q';
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/awdev/cm06wp98m00lf01pnhjvt49pn',
        dragRotate: false, center: [-101.027333, 43.399663],
        zoom: 2,
        pitch: 0,
    });
}