import comms_tower from "./icons/comms_tower.png";
import converter from "./icons/converter.png";
import power_compensator from "./icons/power_compensator.png";
import power_line_ref from "./icons/power_line_ref.png";
import power_plant from "./icons/power_plant.png";
import power_plant_battery from "./icons/power_plant_battery.png";
import power_plant_biomass from "./icons/power_plant_biomass.png";
import power_plant_coal from "./icons/power_plant_coal.png";
import power_plant_geothermal from "./icons/power_plant_geothermal.png";
import power_plant_hydro from "./icons/power_plant_hydro.png";
import power_plant_nuclear from "./icons/power_plant_nuclear.png";
import power_plant_oilgas from "./icons/power_plant_oilgas.png";
import power_plant_solar from "./icons/power_plant_solar.png";
import power_plant_waste from "./icons/power_plant_waste.png";
import power_plant_wind from "./icons/power_plant_wind.png";
import power_pole from "./icons/power_pole.png";
import power_pole_transformer from "./icons/power_pole_transformer.png";
import power_pole_transition from "./icons/power_pole_transition.png";
import power_switch from "./icons/power_switch.png";
import power_tower from "./icons/power_tower.png";
import power_tower_transformer from "./icons/power_tower_transformer.png";
import power_tower_transition from "./icons/power_tower_transition.png";
import power_transformer from "./icons/power_transformer.png";
import power_wind from "./icons/power_wind.png";

const icons: { [key: string]: string } = {
  comms_tower,
  converter,
  power_compensator,
  power_line_ref,
  power_plant,
  power_plant_battery,
  power_plant_biomass,
  power_plant_coal,
  power_plant_geothermal,
  power_plant_hydro,
  power_plant_nuclear,
  power_plant_oilgas,
  power_plant_solar,
  power_plant_waste,
  power_plant_wind,
  power_pole,
  power_pole_transformer,
  power_pole_transition,
  power_switch,
  power_tower,
  power_tower_transformer,
  power_tower_transition,
  power_transformer,
  power_wind,
};

export default async function loadIcons(map: maplibregl.Map) {
  for (const icon in icons) {
    map.loadImage(icons[icon], function (error, image) {
      if (error) throw error;
      if (!image) throw new Error("Image not found");
      map.addImage(icon, image);
    });
  }
}
