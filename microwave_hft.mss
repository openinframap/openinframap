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
      [zoom > 12] {
        name/text-name: "[operator] + ' (' + [ref] + ', ' + [length] + 'km)'"
      }
      name/text-min-distance: 10;
      name/text-dy: -9;
    }
}
