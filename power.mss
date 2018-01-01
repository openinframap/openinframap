@font_face: "DejaVu Sans Book";

@unknown: #7A7A85;
@v10:	  #0000B5;
@v25: 	#00B500;
@v50: 	#B58D00;
@v100: 	#B55D00;
@v200:  #B50000;
@v300:  #B500B1;
@hvdc:  #4E01B5;

@tunnel_case: #7C4544;
@station_outline: #593815;
@text_halo: rgba(230,230,230,0.9);


#power_line::case[tunnel=1] {
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

#power_line::fill [frequency != "0"] {
        // AC power lines
        line-join: round;
	line-cap: round;

	[location="underground"][tunnel != 1],
	[location="underwater"][tunnel != 1] {
		line-dasharray: 10, 5;
	}

	[voltage = null], [voltage < 10] {
		[zoom >= 10] {
			line-color: @unknown;
			line-width: 1;
		}
	}

	[voltage >= 10][voltage < 25] {
		[zoom >= 9] {
			line-width:1;
			line-color: @v10;
		}
	}
	[voltage >= 25][voltage < 50] {
		[zoom >= 9] {
			line-width:1;
			line-color: @v25;
		}
	}

	[voltage >= 50][voltage < 100] {
		[zoom >= 9] {
			line-width: 1;
			line-color: @v50;
		}
	}

	[voltage >= 100][voltage < 200] {
		[zoom >= 6] {
			line-color: @v100;
			line-width:1;
		}
		[zoom >= 9] {
			line-color: @v100;
			line-width:2;
		}
	}

	[voltage >= 200][voltage < 300] {
                [zoom >= 6] {
                        line-color: @v200;
                        line-width: 1;
                }
		[zoom >= 9] {
			line-color: @v200;
			line-width: 2;
		}
	}

	[voltage >= 300] {
		line-color: @v300;
		line-width: 1;
		[zoom >= 4] {
			line-width: 2;
		}
		[zoom >= 9] {
			line-width: 3;
		}
	}
}

#power_line::fill [frequency = "0"] {
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



#power_tower[zoom>14] {
	marker-file: url('symbols/power_tower.svg');
   	marker-width: 8;
}

#power_plant[zoom>=6] {
	line-color: @station_outline;
	line-width:1;
}

/* Render substations as circles at lower zooms */
#substation_point[zoom > 8][zoom < 13][substation = "transmission"][voltage >= 100] {
    marker-type: ellipse;
    marker-line-width: 2;
    marker-line-color: black;

    /* Mapnik is extremely choosy about this rule ordering, beware. */
    marker-fill: @v300;
    marker-width: 15;

    [voltage >= 200][voltage < 300] {
            /* I have *no idea* why but mangacarto wants line styles
             * redefined here and here only. */
            marker-line-width: 2;
            marker-line-color: black;
            marker-fill: @v200;
            marker-width: 12;
    }
    [voltage >= 100][voltage < 200] {
            marker-fill: @v100;
            marker-width: 10;
    }
}

#substation::outline[zoom >= 13] {
    line-color: @station_outline;
    line-width:3;
}

/* Fill substations with their corresponding colour at medium zooms */
#substation::body[zoom >= 13][zoom < 15] {
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


#power_generator[source = "wind"][zoom > 10] {
  marker-file: url('symbols/power_wind.svg');
  marker-width: 10;
}

#substation::label[zoom >= 13],
    #substation::label[zoom >= 11][zoom < 13][voltage >= 300]{
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

        [name != ""] {
                text-name: "[name]";
        }
        [voltage > 0][zoom >= 13] {
                text-name: "'Substation ' + [voltage] + 'kV'";
                [name != ""] {
                        text-name: "[name] + ' ' + [voltage] + 'kV'";
                }
        }
}

#power_line::label {
	text-size: 9;
	text-placement: line;
	text-halo-radius: 2;
	text-dy: 5;
	[tunnel=1] {
		text-dy:10;
	}
	text-halo-fill: @text_halo;
	text-face-name: @font_face;
	text-fill: black;
	text-min-path-length: 100;
        text-spacing: 400;
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

#power_plant::label[zoom>=9][output>100],
  #power_plant::label[zoom>=12] {
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

