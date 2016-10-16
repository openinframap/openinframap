
#power_line::case[tunnel="yes"] {
	line-color: #7C4544;
	line-width: 3;
	[zoom > 9] { 
		line-width: 8;
	}
	[zoom > 15] {
		line-width: 15;
	}
  	line-join: round;
	line-cap: round;
}

#power_line::fill {
	line-color: black;
	line-width:1;	
  	line-join: round;
	line-cap: round;

	[location="underground"][tunnel != "yes"],
	[location="underwater"][tunnel != "yes"] {
		line-dasharray: 10, 5;
	}

	[voltage > 10] {
		line-color: blue;
	}
	[voltage > 25] {
		line-color: green;
	}
	[voltage > 50] {
		line-color: yellow;
	}
	[voltage > 100] {
		line-color: orange;
		line-width:2;	
	}
	[voltage > 200] {
		line-color: red;
		line-width:3;	
	}
	[voltage > 300] {
		line-color: #ff00ff;
		line-width:4;	
	}

	[frequency = 0] {
		line-color: #45057C;
		line-width: 4;
	}
}

#power_line {
	text-size: 9;
	text-placement: line;
	text-halo-radius: 2;
	text-dy: 5;
	[tunnel="yes"] {
		text-dy:15;
	}
	text-halo-fill: rgba(255,255,255,0.8);
	text-face-name: 'Arial Regular';
	text-fill: black;
	[zoom>13] {
		text-name: "[name]";
		[voltage > 0] {
			text-name: "[name] + ' ' + [voltage] + 'kV'";
		}
	}
}

#power_tower {
	marker-file: url('symbols/power_tower.svg');
   	marker-width: 5;
}

#power_plant {
	line-color: black;
	line-width:1;
}

#power_plant[zoom>10] {
	text-size: 12;
	text-dy: 10;
	text-halo-radius: 2;
	text-halo-fill: rgba(255,255,255,0.8);
	text-face-name: 'Arial Regular';
	text-fill: black;
	text-wrap-width: 50;
	text-name: "[name]";
	[source != ""] {
		text-name: "[name] + ' (' + [source] + ')'"
	}
}

#substation {
	line-color: black;
	line-width:1;
	text-size: 12;
	text-dy: 10;
	text-halo-radius: 2;
	text-halo-fill: rgba(255,255,255,0.8);
	text-face-name: 'Arial Regular';
	text-fill: black;
	text-wrap-width: 50;

	[zoom > 15],
	[zoom > 13][voltage > 100],
	[zoom > 10][voltage > 200] {
		text-name: "[name]";
		[voltage > 0] {
			text-name: "[name] + ' ' + [voltage] + 'kV'";
		}
	}
}

#substation {
	[voltage > 25] {
		polygon-fill: green;
	}
	[voltage > 50] {
		polygon-fill: yellow;
	}
	[voltage > 100] {
		polygon-fill: orange;
	}
	[voltage > 200] {
		polygon-fill: red;
	}
	[voltage > 300] {
		polygon-fill: #ff00ff;
	}
}

