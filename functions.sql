CREATE EXTENSION intarray;

-- Convert a power value into a numeric value in watts
CREATE OR REPLACE FUNCTION convert_power(value TEXT) RETURNS NUMERIC AS $$
DECLARE
  parts TEXT[];
  val NUMERIC;
BEGIN
  parts := regexp_matches(value, '([0-9][0-9\.,]*)[ ]?([KMG]?W)?', '');
  val := replace(parts[1], ',', '.');
  IF parts[2] = 'KW' THEN
    val := val * 1e3;
  ELSIF parts[2] = 'MW' THEN
    val := val * 1e6;
  ELSIF parts[2] = 'GW' THEN
    val := val * 1e9;
  END IF;
  RETURN val;
END
$$ LANGUAGE plpgsql;

-- Select the highest voltage from a semicolon-delimited list
CREATE OR REPLACE FUNCTION convert_voltage(value TEXT) RETURNS NUMERIC AS $$
DECLARE
  parts TEXT[];
BEGIN
  parts := regexp_matches(value, '([0-9][0-9\.,]+)[;]?.*', '');
  RETURN replace(parts[1], ',', '.');
END
$$ LANGUAGE plpgsql;

-- Combine two voltage fields into one
CREATE OR REPLACE FUNCTION combine_voltage(a TEXT, b TEXT) RETURNS TEXT AS $$
DECLARE
    parts INT[];
BEGIN
    parts = string_to_array(a, ';')::INT[];
    parts = array_cat(parts, string_to_array(b, ';')::INT[]);
    RETURN array_to_string(uniq(sort_desc(parts)), ';');
END
$$ LANGUAGE plpgsql;

-- Aggregate to combine voltages into one delimited voltage field
DROP AGGREGATE voltage_agg IF EXISTS;
CREATE AGGREGATE voltage_agg (TEXT)
(
    sfunc = combine_voltage,
    stype = TEXT,
    initcond = ''
);

-- Combine two fields with a semicolon
CREATE OR REPLACE FUNCTION combine_field(a TEXT, b TEXT) RETURNS TEXT AS $$
DECLARE
BEGIN
    IF a = '' OR a IS NULL THEN
        RETURN b;
    ELSIF b = '' OR b IS NULL THEN
        RETURN a;
    END IF;
    RETURN a || ';' || b;   
END
$$ LANGUAGE plpgsql;

DROP AGGREGATE field_agg IF EXISTS;
CREATE AGGREGATE field_agg (TEXT)
(
    sfunc = combine_field,
    stype = TEXT,
    initcond = ''
);


CREATE OR REPLACE VIEW substation AS
    SELECT geometry AS geometry, name, voltage, substation, operator
                  FROM osm_power_substation
    UNION ALL
    SELECT ST_Union(mem.geometry) AS geometry, rel.name,
        combine_voltage(rel.voltage, voltage_agg(mem.voltage)) AS voltage,
        combine_field(rel.substation, field_agg(mem.substation)) AS substation,
        combine_field(rel.operator, field_agg(mem.operator)) AS operator
        FROM osm_power_substation_relation as rel, osm_power_substation_relation_member as mem
        WHERE mem.osm_id = rel.osm_id
        GROUP BY rel.osm_id, rel.name, rel.voltage, rel.substation, rel.operator;


