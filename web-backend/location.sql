CREATE SCHEMA location;

create index country_eez_geom_transformed on countries.country_eez using gist (st_transform(country_eez.geom, 3857)) where "union" != 'Antarctica';

CREATE TABLE power_line_location (
	osm_id INTEGER PRIMARY KEY REFERENCES osm_power_line(id) ON DELETE CASCADE,


