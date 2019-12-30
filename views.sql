DROP VIEW IF EXISTS substation;
DROP MATERIALIZED VIEW IF EXISTS power_substation_relation;

CREATE MATERIALIZED VIEW power_substation_relation AS
    SELECT rel.osm_id, ST_ConvexHull(ST_Union(mem.geometry)) AS geometry, rel.tags -> 'name' AS name,
        combine_voltage(rel.voltage, voltage_agg(mem.tags -> 'voltage')) AS voltage,
        rel.tags -> 'frequency' AS frequency,
        combine_field(rel.tags -> 'substation', field_agg(mem.tags -> 'substation')) AS substation,
        combine_field(rel.tags -> 'operator', field_agg(mem.tags -> 'operator')) AS operator,
	rel.tags
        FROM osm_power_substation_relation as rel, osm_power_substation_relation_member as mem
        WHERE mem.osm_id = rel.osm_id
        GROUP BY rel.osm_id, rel.tags -> 'name', rel.voltage, rel.tags -> 'frequency',
			rel.tags -> 'substation', rel.tags -> 'operator', rel.tags;

CREATE INDEX power_substation_relation_geom ON power_substation_relation USING GIST (geometry);

ANALYZE power_substation_relation;

CREATE OR REPLACE VIEW substation AS
    SELECT osm_id, geometry, tags -> 'name' AS name, voltage, substation, tags
                  FROM osm_power_substation
    UNION
    SELECT osm_id, geometry, name, voltage, substation, tags
                  FROM power_substation_relation;

DROP VIEW IF EXISTS power_plant;
DROP MATERIALIZED VIEW IF EXISTS power_plant_relation;

CREATE MATERIALIZED VIEW power_plant_relation AS
    SELECT rel.osm_id, ST_ConvexHull(ST_Union(mem.geometry)) AS geometry, 
        (rel.tags -> 'name') AS name, rel.output, rel.source, rel.tags
        FROM osm_power_plant_relation as rel, osm_power_plant_relation_member as mem
        WHERE mem.osm_id = rel.osm_id
        GROUP BY rel.osm_id, rel.tags -> 'name', rel.output, rel.source, rel.tags;

CREATE INDEX power_plant_relation_geom ON power_plant_relation USING GIST (geometry);

ANALYZE power_plant_relation;

CREATE OR REPLACE VIEW power_plant AS
    SELECT osm_id, geometry, tags -> 'name' AS name, output, source, tags
              FROM osm_power_plant
    UNION
    SELECT osm_id, geometry, name, output, source, tags
              FROM power_plant_relation;
