DROP VIEW IF EXISTS substation;
DROP MATERIALIZED VIEW IF EXISTS power_substation_relation;

CREATE MATERIALIZED VIEW power_substation_relation AS
    SELECT ST_ConvexHull(ST_Union(mem.geometry)) AS geometry, rel.name,
        combine_voltage(rel.voltage, voltage_agg(mem.voltage)) AS voltage,
        combine_field(rel.substation, field_agg(mem.substation)) AS substation,
        combine_field(rel.operator, field_agg(mem.operator)) AS operator
        FROM osm_power_substation_relation as rel, osm_power_substation_relation_member as mem
        WHERE mem.osm_id = rel.osm_id
        GROUP BY rel.osm_id, rel.name, rel.voltage, rel.substation, rel.operator;

CREATE INDEX power_substation_relation_geom ON power_substation_relation USING GIST (geometry);

ANALYZE power_substation_relation;

CREATE OR REPLACE VIEW substation AS
    SELECT geometry, name, voltage, substation, operator
                  FROM osm_power_substation
    UNION
    SELECT geometry, name, voltage, substation, operator
                  FROM power_substation_relation;

DROP VIEW IF EXISTS power_plant;
DROP MATERIALIZED VIEW IF EXISTS power_plant_relation;

CREATE MATERIALIZED VIEW power_plant_relation AS
    SELECT ST_ConvexHull(ST_Union(mem.geometry)) AS geometry, 
        rel.name, rel.operator, rel.output, rel.source
        FROM osm_power_plant_relation as rel, osm_power_plant_relation_member as mem
        WHERE mem.osm_id = rel.osm_id
        GROUP BY rel.osm_id, rel.name, rel.output, rel.source, rel.operator;

CREATE INDEX power_plant_relation_geom ON power_plant_relation USING GIST (geometry);

ANALYZE power_plant_relation;

CREATE OR REPLACE VIEW power_plant AS
    SELECT geometry, name, operator, output, source
              FROM osm_power_plant
    UNION
    SELECT geometry, name, operator, output, source
              FROM power_plant_relation;
