var map = L.Mapzen.map('map', {
  center: [0,0],
  zoom: 4,
  scene: L.Mapzen.BasemapStyles.ZincNoLabels
});

var locator = L.Mapzen.locator();
locator.setPosition('topleft');
locator.addTo(map);
L.Mapzen.hash({
  map: map
})

var geocoder = L.Mapzen.geocoder('mapzen-h6pU6jc');
geocoder.addTo(map);
