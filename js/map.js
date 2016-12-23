var base_carto = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png', {
attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
});

var base_osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
   attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

var base_layers = {
  'Carto Positron': base_carto,
  'OSM': base_osm
};

var oim_attr = '<a href="/about.html">About OpenInfraMap</a>'
var oim_tileserver = 'https://tiles-{s}.openinframap.org';

var power = L.tileLayer(oim_tileserver + '/power/{z}/{x}/{y}.png',
                        {attribution: oim_attr});
var comms = L.tileLayer(oim_tileserver + '/telecoms/{z}/{x}/{y}.png',
                        {attribution: oim_attr});
var petroleum = L.tileLayer(oim_tileserver + '/petroleum/{z}/{x}/{y}.png',
                        {attribution: oim_attr});
var water = L.tileLayer(oim_tileserver + '/water/{z}/{x}/{y}.png',
                        {attribution: oim_attr});
var hft = L.tileLayer(oim_tileserver + '/microwave_hft/{z}/{x}/{y}.png?1',
                        {attribution: 'Ofcom, <a href="https://carte-fh.lafibre.info/">carte-fh.lafibre.info</a>'});


var overlay_layers = {
  'Power': power,
  'Telecoms': comms,
  'Petroleum': petroleum,
  'Water': water,
  'Microwave (HFT)': hft
}

var map = L.map('map', {
  center: [31.99,-40.91],
  zoom: 4,
  editInOSMControlOptions: {},
  layers: [base_carto, power, comms]
});

L.control.layers(base_layers, overlay_layers).addTo(map);
var locator = L.Mapzen.locator();
locator.setPosition('topleft');
locator.addTo(map);

L.Mapzen.hash({
  map: map
})
/*
L.Control.JOSMEdit = L.Control.extend({
  onAdd: function(map) {
    var link = L.DomUtil.create('div', 'editlink');
    link.innerHTML = '<a href="">Edit</a>';
    L.DomEvent.on(link, 'click', function(e) {
      console.log('click');
    });
    return link;
  },
  onRemove: function(map) {
    L.DomEvent.off(L.DomUtil.get('editlink'));
  }
});

(new L.Control.JOSMEdit({position: 'bottomright'})).addTo(map);
*/
