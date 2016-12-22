@font_face: "DejaVu Sans Book";

#data_center::fill {
    line-color: #6A37AB;
    line-width:1;
    polygon-fill: #7D59AB;
}

#data_center::label[zoom > 10] {
    text-size: 12;
    text-halo-radius: 2;
    text-halo-fill: rgba(255,255,255,0.8);
    text-face-name: @font_face;
    text-fill: black;
    text-wrap-width: 50;
    text-name: "[name]";

    [operator != ''] {
      text-name: "[operator]";
      [name != '' ] {
          text-name: "[name] + ' (' + [operator] + ')'";
      }
    }
}

#communication_line {
	  line-color: blue;
	  line-width:1;

    [location = 'underground'] {
      line-dasharray: 10, 5;
    }

    [zoom > 6] {
      text-size: 10;
      text-placement: line;
      text-halo-radius: 2;
      text-halo-fill: rgba(255,255,255,0.8);
      text-face-name: @font_face;
      text-fill: black;
      text-min-path-length: 100;
      text-name: "[name]";
      text-min-distance: 2;
    }
}

#mast[zoom > 6] {
  marker-file: url('symbols/comms_tower.svg');
  marker-width: 8;

  text-size: 10;
  text-placement-type: simple;
  text-placements: "E,NE,SE,W,NW,SW";
  text-halo-radius: 2;
  text-halo-fill: rgba(255,255,255,0.8);
  text-face-name: @font_face;
  text-fill: black;
  text-name: "[name]";

  [operator != ''] {
    text-name: "[name] + ' (' + [operator] + ')'";}
  }
