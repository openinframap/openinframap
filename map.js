var power = L.tileLayer('http://{s}.tiles.openinframap.org/power/{z}/{x}/{y}.png');
var base = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
});


var map = L.map('map', {
  center: [0,0],
  zoom: 4,
});

map.addLayer(base);

map.addLayer(power);
power.bringToFront();

var locator = L.Mapzen.locator();
locator.setPosition('topleft');
locator.addTo(map);
L.Mapzen.hash({
  map: map
})

var geocoder = L.Mapzen.geocoder('mapzen-h6pU6jc');
geocoder.addTo(map);
