@font_face: "DejaVu Sans Book"

@unknown: #555;
@v10:	blue;
@v25: 	green;
@v50: 	#bd9300;
@v100: 	orange;
@v200:  #ff0303;
@v300:  #ff22ff;
@hvdc:  #45057C;

@tunnel_case: #7C4544;
@station_outline: #593815;
@text_halo: rgba(230,230,230,0.9);


#power_line::case[tunnel=1] {
	line-color: @tunnel_case;
	line-width: 3;
	[zoom > 11] { 
		line-width: 8;
	}
	[zoom > 15] {
		line-width: 15;
	}
  	line-join: round;
	line-cap: round;
}

#power_line::fill {
  	line-join: round;
	line-cap: round;

	[location="underground"][tunnel != 1],
	[location="underwater"][tunnel != 1] {
		line-dasharray: 10, 5;
	}

	[voltage = null], [voltage < 10] {
		[zoom >= 11] {
			line-color: @unknown;
			line-width: 1;
		}
	}

	[voltage >= 10][voltage < 25] { 
		[zoom >= 10] {
			line-width:1;
			line-color: @v10;
		}
	}
	[voltage >= 25][voltage < 50] {
		[zoom >= 10] {
			line-width:1;
			line-color: @v25;
		}
	}

	[voltage >= 50][voltage < 100] {
		[zoom >= 10] {
			line-width: 1;
			line-color: @v50;
		}
	}

	[voltage >= 100][voltage < 200] {
		[zoom >= 5] {
			line-color: @v100;
			line-width:1;	
		}
		[zoom >= 9] {
			line-color: @v100;
			line-width:2;	
		}
	}

	[voltage >= 200][voltage < 300] {
		line-color: @v200;
		line-width: 1;
		[zoom >= 9] {
			line-color: @v200;
			line-width: 2;	
		}
	}

	[voltage >= 300] {
		line-color: @v300;
		line-width: 1;
		[zoom >= 3] {
			line-width: 2;
		}
		[zoom >= 8] {
			line-width: 4;	
		}
	}

	[frequency = "0"] {
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
}

#power_line {
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
	}
}

#power_tower[zoom>14] {
	marker-file: url('symbols/power_tower.svg');
   	marker-width: 8;
}

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
	[voltage >= 25][voltage < 50] {
		polygon-fill: @v25;
	}
	[voltage >= 50][voltage < 100] {
		polygon-fill: @v50;
	}
	[voltage >= 100][voltage < 200] {
		polygon-fill: @v100;
	}
	[voltage >= 200][voltage < 300] {
		polygon-fill: @v200;
	}
	[voltage >= 300] {
		polygon-fill: @v300;
	}
}

