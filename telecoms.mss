@font_face: "DejaVu Sans Book";

#data_center {
    line-color: #6A37AB;
    line-width:1;
    polygon-fill: #7D59AB;
    text-size: 12;
    [zoom > 10] {
      text-halo-radius: 2;
      text-halo-fill: rgba(255,255,255,0.8);
      text-face-name: @font_face;
      text-fill: black;
      text-wrap-width: 50;
      text-name: "[name] + ' (' + [operator] + ')'";
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
