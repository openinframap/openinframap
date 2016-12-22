@font_face: "DejaVu Sans Book";

#microwave_link [type = 'finance'] {
	  line-color: #009C1B;
	  line-width:1;

    [zoom > 10] {
      name/text-size: 10;
      name/text-placement: line;
      name/text-halo-radius: 2;
      name/text-halo-fill: rgba(255,255,255,0.8);
      name/text-face-name: @font_face;
      name/text-fill: black;
      name/text-min-path-length: 100;
      name/text-name: "[operator]";
      name/text-min-distance: 10;
      name/text-dy: -9;
    }

    [zoom > 12] {
      ref/text-size: 10;
      ref/text-placement: line;
      ref/text-halo-radius: 2;
      ref/text-halo-fill: rgba(255,255,255,0.8);
      ref/text-face-name: @font_face;
      ref/text-fill: black;
      ref/text-min-path-length: 100;
      ref/text-name: "[ref]";
      ref/text-min-distance: 10;
      ref/text-dy: 9;
    }
}
