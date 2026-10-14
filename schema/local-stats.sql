-- One-off per-country stats snapshot for local builds (scripts/build-region.sh).
--
-- Same results as schema/jobs/update-stats.sql (the production job), but it
-- loops over countries and finds the features inside each one, instead of
-- looping over features. That way PostGIS prepares each country polygon once.
-- Russia's polygon crosses the antimeridian, so its bounding box covers the
-- whole world and the feature-first plan compares every feature against it:
-- for Russia that took 14+ minutes for power lines alone, this takes seconds.
-- OFFSET 0 stops the planner from flattening the subquery back into a join.

BEGIN;

INSERT INTO stats.power_line (time, country, voltage, length)
	SELECT now(), eez."union", convert_voltage(f.voltage)::INTEGER,
		sum(ST_Length(ST_Transform(f.geometry, 4326)::geography))
	FROM countries.country_eez_3857 AS eez
	CROSS JOIN LATERAL (
		SELECT voltage, geometry FROM osm_power_line
		WHERE ST_Contains(eez.geom, geometry)
			AND tags->'construction:power' IS NULL
			AND tags->'disused:power' IS NULL
		OFFSET 0) f
	WHERE eez."union" != 'Antarctica'
	GROUP BY eez."union", convert_voltage(f.voltage);

INSERT INTO stats.power_plant (time, country, source, count, output)
	SELECT now(), eez."union", f.source, count(*), convert_power(f.output)
	FROM countries.country_eez_3857 AS eez
	CROSS JOIN LATERAL (
		SELECT source, output FROM power_plant
		WHERE ST_Contains(eez.geom, geometry)
			AND tags->'construction:power' IS NULL
			AND tags->'disused:power' IS NULL
		OFFSET 0) f
	WHERE eez."union" != 'Antarctica'
	GROUP BY eez."union", f.source, convert_power(f.output);

INSERT INTO stats.power_generator (time, country, source, count, output)
	SELECT now(), eez."union", f.source, count(*), convert_power(f.output)
	FROM countries.country_eez_3857 AS eez
	CROSS JOIN LATERAL (
		SELECT source, output FROM osm_power_generator
		WHERE ST_Contains(eez.geom, geometry)
			AND tags->'construction:power' IS NULL
			AND tags->'disused:power' IS NULL
		OFFSET 0) f
	WHERE eez."union" != 'Antarctica'
	GROUP BY eez."union", f.source, convert_power(f.output);

INSERT INTO stats.substation (time, country, voltage, count)
	SELECT now(), eez."union", convert_voltage(f.voltage)::INTEGER, count(*)
	FROM countries.country_eez_3857 AS eez
	CROSS JOIN LATERAL (
		SELECT voltage FROM substation
		WHERE ST_Contains(eez.geom, geometry)
			AND tags->'construction:power' IS NULL
			AND tags->'disused:power' IS NULL
		OFFSET 0) f
	WHERE eez."union" != 'Antarctica'
	GROUP BY eez."union", convert_voltage(f.voltage);

COMMIT;
