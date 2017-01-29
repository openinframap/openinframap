@font_face: "DejaVu Sans Book";

#pipeline {
	  line-color: brown;
	  line-width:1;

    [zoom > 6] {
      text-size: 10;
      text-placement: line;
      text-halo-radius: 2;
      text-halo-fill: rgba(255,255,255,0.8);
      text-face-name: @font_face;
      text-fill: black;
      text-min-path-length: 100;
      text-name: "[name]";
    }
}

#well {
    marker-fill: brown;
    marker-line-width: 0;
    marker-width: 2;
    marker-height: 2;

    [zoom > 12] {
      marker-width: 10;
      marker-height: 10;
      text-placement-type: simple;
      text-placements: "N,S,E,W,NE,SE,NW,SW,12,10,8";
      text-halo-radius: 2;
      text-halo-fill: rgba(255,255,255,0.8);
      text-face-name: @font_face;
      text-fill: black;
      text-name: "[name]";
    }
}
