CREATE EXTENSION intarray;

-- Drop all views here so that imposm3 can swap tables around
DROP VIEW substation;
DROP VIEW power_plant;

-- Convert a power value into a numeric value in watts
CREATE OR REPLACE FUNCTION convert_power(value TEXT) RETURNS NUMERIC AS $$
DECLARE
  parts TEXT[];
  val NUMERIC;
BEGIN
  parts := regexp_matches(upper(value), '([0-9][0-9\.,]*)[ ]?([KMG]?W)?', '');
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
DROP AGGREGATE IF EXISTS voltage_agg(TEXT);
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

DROP AGGREGATE IF EXISTS field_agg(TEXT);
CREATE AGGREGATE field_agg (TEXT)
(
    sfunc = combine_field,
    stype = TEXT,
    initcond = ''
);


