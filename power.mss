@font_face: "DejaVu Sans Book";

@unknown: #32324C;
@v1:    #00FF21;
@v25: 	#18A553;
@v45:   #CC5EFF;
@v100: 	#7FD9F8;
@v190: 	#4759BC;
@v250:  #EB47CF;
@v450:  #FF9960;
@v1000: #E23131;
@hvdc:  #4E01B5;

@busbar_case:   #FFD800;
@bay_case:      #A0A0A0;
@tunnel_case: #7C4544;

@substation_outline: #593815;
@text_halo: rgba(230,230,230,0.9);
@portal: #808080;

#power_cable::case[tunnel=1] {
	line-color: @tunnel_case;
	[zoom > 7] {
  		line-width: 3;
 	}
	[zoom > 11] {
		line-width: 8;
	}
	[zoom > 15] {
		line-width: 15;
	}
  	line-join: round;
	line-cap: round;
}
#power_cable::fill {
	[location="underground"][tunnel != 1],
	[location="underwater"][tunnel != 1] {
		line-dasharray: 10, 5;
	}
	
	[zoom > 7] {
  		line-width: 1;
 	}
	[zoom > 11] {
		line-width: 4;
	}
	[zoom > 15] {
		line-width: 9;
	}
  	line-join: round;
	line-cap: round;
}

#power_cable::fill [frequency != "0"],
#power_line::fill [frequency != "0"] {
	// AC power lines and cables
  	line-join: round;
	line-cap: round;

	[voltage = null], [voltage < 10] {
		[zoom >= 11] {
			line-color: @unknown;
			line-width: 1;
		}
	}
	[voltage >= 0][voltage <= 1] {
		[zoom >= 10] {
			line-width:1;
			line-color: @v1;
		}
	}
	[voltage > 1][voltage <= 25] {
		[zoom >= 10] {
			line-width:1;
			line-color: @v25;
		}
	}
	[voltage > 25][voltage <= 45] {
		[zoom >= 10] {
			line-width: 1;
			line-color: @v45;
		}
	}
	[voltage > 45][voltage <= 100] {
		[zoom >= 5] {
			line-color: @v100;
			line-width:1;
		}
		[zoom >= 9] {
			line-color: @v100;
			line-width:2;
		}
	}
	[voltage > 100][voltage <= 190] {
		line-color: @v190;
		line-width: 1;
		[zoom >= 9] {
			line-color: @v190;
			line-width: 2;
		}
	}
	[voltage > 190][voltage <= 250] {
		line-color: @v250;
		line-width: 1;
		[zoom >= 9] {
			line-color: @v250;
			line-width: 2;
		}
	}
	[voltage > 250][voltage <= 450] {
		line-color: @v450;
		line-width: 1;
		[zoom >= 4] {
			line-width: 2;
		}
		[zoom >= 9] {
			line-width: 3;
		}
	}
	[voltage > 450] {
		line-color: @v1000;
		line-width: 1;
		[zoom >= 4] {
			line-width: 2;
		}
		[zoom >= 9] {
			line-width: 3;
		}
	}
}

#power_cables::fill [frequency = "0"],
#power_line::fill [frequency = "0"]{
	// HVDC interconnectors
	line-color: @hvdc;
	line-width: 1;
	line-dasharray: 10, 5;
 	[zoom >= 3] {
		line-color: @hvdc;
		line-width: 2;
	}
	[zoom >= 8] {
		line-color: @hvdc;
		line-width: 4;
	}
}

#power_line,
#power_cables {
	text-size: 9;
	text-placement: line;
	text-halo-radius: 2;
	text-dy: 5;
	[tunnel=1] {
		text-dy:15;
	}
	text-halo-fill: @text_halo;
	text-face-name: @font_face;
	text-fill: black;
	text-min-path-length: 100;
	[zoom>13] {
		text-name: "[name]";
		[voltage > 0] {
			text-name: "[name] + ' ' + [voltage] + 'kV'";
		}
		[frequency = "0"] {
			text-name: "[name] + ' (HVDC)'"
		}
	}
}

#power_tower[zoom>14] {
	marker-file: url('symbols/power_tower.svg');
   	marker-width: 8;
}

// Need styles for poles (SVG Symbol)

#power_portal[zoom>14] {
	line-color: @portal;
	line-width: 2;
}

// Power generation
#power_plant[zoom>=6] {
	line-color: @station_outline;
	line-width:1;
}

#power_plant[zoom>=9][output>100],
  #power_plant[zoom>=12] {
	text-size: 12;
	text-dy: 10;
	text-halo-radius: 2;
	[zoom >= 14] {
		text-halo-radius: 4;
	}
	text-halo-fill: @text_halo;
	text-face-name: @font_face;
	text-fill: black;
	text-wrap-width: 50;
	text-name: "[name]";
	[source != ""] {
		text-name: "[name] + ' (' + [source] + ')'";
		[output != ""] {
			text-name: "[name] + '\n (' + [source] + ', ' + [output] + 'MW)'";
		}
	}
}

#power_generator[source = "wind"][zoom > 10] {
  marker-file: url('symbols/power_wind.svg');
  marker-width: 10;
}

// Substations
#substation {
	text-size: 12;
	text-dy: 10;
	text-halo-radius: 2;
	[zoom >= 14] {
		text-halo-radius: 4;
	}
	text-halo-fill: @text_halo;
	text-face-name: @font_face;
	text-fill: black;
	text-wrap-width: 50;

	[zoom >= 13],
	[zoom >= 12][voltage > 100],
	[zoom >= 10][voltage > 200] {
		line-color: @station_outline;
		line-width:1;

		[zoom >= 13] {
			line-color: @station_outline;
			line-width:1;
			[name != ""] {
				text-name: "[name]";
			}
			[voltage > 0] {
				text-name: "'Substation ' + [voltage] + 'kV'";
				[name != ""] {
					text-name: "[name] + ' ' + [voltage] + 'kV'";
				}
			}
		}
	}
}

#substation {
	[voltage = null], [voltage < 10] {
		polygon-fill: @unknown;
	}
	[voltage >= 0][voltage <= 1] {
		polygon-fill: @v1;
	}
	[voltage > 1][voltage <= 25] {
		polygon-fill: @v25;
	}
	[voltage > 25][voltage <= 45] {
		polygon-fill: @v45;
	}
	[voltage > 45][voltage <= 100] {
		polygon-fill: @v100;
	}
	[voltage > 100][voltage <= 190] {
		polygon-fill: @v190;
	}
	[voltage > 190][voltage <= 250] {
		polygon-fill: @v250;
	}
	[voltage > 250][voltage <= 450] {
		polygon-fill: @v450;
	}
	[voltage > 450] {
		polygon-fill: @v1000;
	}
}
