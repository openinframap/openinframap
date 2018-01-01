CREATE OR REPLACE VIEW substation AS
    SELECT geometry AS geometry, name, voltage, substation, operator
                  FROM osm_power_substation
    UNION ALL
    SELECT ST_ConvexHull(ST_Union(mem.geometry)) AS geometry, rel.name,
        combine_voltage(rel.voltage, voltage_agg(mem.voltage)) AS voltage,
        combine_field(rel.substation, field_agg(mem.substation)) AS substation,
        combine_field(rel.operator, field_agg(mem.operator)) AS operator
        FROM osm_power_substation_relation as rel, osm_power_substation_relation_member as mem
        WHERE mem.osm_id = rel.osm_id
        GROUP BY rel.osm_id, rel.name, rel.voltage, rel.substation, rel.operator;

CREATE OR REPLACE VIEW power_plant AS
    SELECT geometry, name, operator, output, source
              FROM osm_power_plant
    UNION ALL
    SELECT ST_ConvexHull(ST_Union(mem.geometry)) AS geometry, rel.name, rel.source, rel.operator, rel.output
        FROM osm_power_plant_relation as rel, osm_power_plant_relation_member as mem
        WHERE mem.osm_id = rel.osm_id
        GROUP BY rel.osm_id, rel.name, rel.output, rel.source, rel.operator;
