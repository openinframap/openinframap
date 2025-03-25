-----------------------------
-- Queries used to update the stats schema:

BEGIN;

INSERT INTO stats.power_line (time, country, voltage, length)
	SELECT now() AS time, eez."union" AS country, convert_voltage(voltage)::INTEGER AS voltage,
		sum(ST_Length(ST_Transform(geometry, 4326)::geography)) AS length
	FROM osm_power_line, countries.country_eez_3857 AS eez
	WHERE ST_Contains(eez.geom, geometry)
		AND "union" != 'Antarctica'
		AND tags->'construction:power' IS NULL
		AND tags->'disused:power' IS NULL
	GROUP BY eez."union", convert_voltage(voltage);


INSERT INTO stats.power_plant (time, country, source, count, output)
	SELECT now() AS time, eez."union", source, count(*), convert_power(output)
	FROM power_plant, countries.country_eez_3857 AS eez
	WHERE ST_Contains(eez.geom, geometry)
		AND "union" != 'Antarctica'
		AND tags->'construction:power' IS NULL
		AND tags->'disused:power' IS NULL
	GROUP BY eez."union", source, convert_power(output);


INSERT INTO stats.power_generator (time, country, source, count, output)
	SELECT now() AS time, eez."union", source, count(*), convert_power(output)
	FROM osm_power_generator, countries.country_eez_3857 AS eez
	WHERE ST_Contains(eez.geom, geometry)
		AND "union" != 'Antarctica'
		AND tags->'construction:power' IS NULL
		AND tags->'disused:power' IS NULL
	GROUP BY eez."union", source, convert_power(output);

INSERT INTO stats.substation (time, country, voltage, count)
	SELECT now() AS time, eez."union" AS country, convert_voltage(voltage)::INTEGER AS voltage, count(*)
	FROM substation, countries.country_eez_3857 AS eez
	WHERE ST_Contains(eez.geom, geometry)
		AND "union" != 'Antarctica'
		AND tags->'construction:power' IS NULL
		AND tags->'disused:power' IS NULL
	GROUP BY eez."union", convert_voltage(voltage);

COMMIT;