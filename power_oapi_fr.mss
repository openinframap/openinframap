{{style:

/* Substations */
area[power=substation][substation=transmission]{width:3;color:#FFD800;fill-color:#FFD800;fill-opacity:0.05;}

/* Supports */
way[power=portal]{width:2;color:#FFFFFF;}

/* Power lines */
way[power=line]{text:cables;font-size:14px;text-halo-radius:2;}
way[power=cable]{dashes:2,2;text:cables;font-size:14px;text-halo-radius:2;}
way[power=line][cables=6],way[power=line][circuits=2]{left-casing-dashes:2,14;left-casing-width:5;}
way[power=line][voltage=~/42000/],way[power=cable][voltage=~/42000/]{width:1;color:#FFFFFF;text-halo-color:#FFFFFF;}
way[power=line][voltage=~/63000/],way[power=cable][voltage=~/63000/]{width:2;color:#BF0054;text-halo-color:#BF0054;}
way[power=line][voltage=~/90000/],way[power=cable][voltage=~/90000/]{width:2;color:#FF8000;text-halo-color:#FF8000;}
way[power=line][voltage=~/150000/],way[power=cable][voltage=~/150000/]{width:3;color:#003DB0;text-halo-color:#003DB0;}
way[power=line][voltage=~/225000/],way[power=cable][voltage=~/225000/]{width:4;color:#009414;text-halo-color:#009414;}
way[power=line][voltage=~/400000/],way[power=cable][voltage=~/400000/]{width:5;color:#FF0000;text-halo-color:#FF0000;}

way[power=line][voltage=20000], way[power=cable][voltage=20000]{width:1;color:#0094FF;text-halo-color:#0094FF;}
way[power=line][voltage=15000], way[power=cable][voltage=15000]{width:1;color:#0094FF;dashes:4,2;text-halo-color:#0094FF;}

way[power=line][line=busbar]{casing-color:#FFD800;casing-width:1;width:3;}
way[power=line][line=bay]{casing-color:#A0A0A0;casing-width:2;width:3;}

/* Operateurs */
way[operator="ERDF"]{casing-width:1;casing-dashes:4,2;casing-color:#FF0000;}

}}
