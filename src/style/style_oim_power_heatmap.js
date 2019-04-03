
const generator_weight = ['interpolate', 
  ['linear'], 
  ['get', 'output'], 
  0, 0, 
  30, 0.25,
  250, 0.5,
  1000, 0.7,
  2000, 1
];

const layers = [
  {
    zorder: 162,
    id: 'heatmap_solar',
    type: 'heatmap',
    source: 'openinframap',
    'source-layer': 'power_heatmap_solar',
    minzoom: 1,
    maxzoom: 13,
    paint: {
      'heatmap-weight': generator_weight,
      'heatmap-intensity': 1,//['interpolate', ['linear'], ['zoom'], 2, 2, 10, 1],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(255,255,204,0)',
        0.1,
        'rgb(255,237,160)',
        0.2,
        'rgb(254,217,118)',
        0.3,
        'rgb(254,178,76)',
        0.45,
        'rgb(253,141,60)',
        0.55,
        'rgb(252,78,42)',
        0.7,
        'rgb(227,26,28)',
        0.9,
        'rgb(189,0,38)',
        1,
        'rgb(128,0,38)',
      ],
      // Adjust the heatmap radius by zoom level
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 2, 12, 10],
    },
    layout: {
      'visibility': 'none'
    },
  },
];

export {layers as default};
