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

#petroleum_well {
    marker-fill: brown;
    marker-line-width: 0;
    marker-width: 2;
    marker-height: 2;

    [zoom > 6] {
      marker-width: 10;
      marker_height: 10;
      text-size: 10;
      text-halo-radius: 2;
      text-halo-fill: rgba(255,255,255,0.8);
      text-face-name: @font_face;
      text-fill: black;
      text-name: "[name]";
    }
}
