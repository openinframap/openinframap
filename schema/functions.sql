\c osm osm

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS intarray;
CREATE EXTENSION IF NOT EXISTS hstore;

-- Drop all views here so that imposm3 can swap tables around
DROP VIEW IF EXISTS substation;
DROP VIEW IF EXISTS power_plant;
DROP MATERIALIZED VIEW IF EXISTS power_substation_relation;
DROP MATERIALIZED VIEW IF EXISTS power_plant_relation;

-- Convert a power value into a numeric value in watts
CREATE OR REPLACE FUNCTION convert_power(value TEXT) RETURNS NUMERIC
PARALLEL SAFE
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
DECLARE
  parts TEXT[];
  val NUMERIC;
BEGIN
  parts := regexp_matches(upper(value), '([0-9]+[\.,]?[0-9]*)[ ]?([KMG]?W)?', '');
  val := replace(parts[1], ',', '.');
  IF parts[2] = 'KW' THEN
    val := val * 1e3;
  ELSIF parts[2] = 'MW' THEN
    val := val * 1e6;
  ELSIF parts[2] = 'GW' THEN
    val := val * 1e9;
  ELSE
    -- Consider no units to be invalid
    val := NULL;
  END IF;
  RETURN val;
END
$$ LANGUAGE plpgsql;

-- Select the highest voltage from a semicolon-delimited list
CREATE OR REPLACE FUNCTION convert_voltage(value TEXT) RETURNS NUMERIC
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
AS $$
  SELECT value FROM convert_integer_list(value) ORDER BY value DESC LIMIT 1;
$$ LANGUAGE SQL;

-- Convert a semicolon-delimited list of integers into a table of integer voltages.
CREATE OR REPLACE FUNCTION convert_integer_list(value TEXT) RETURNS TABLE (value INTEGER)
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
AS $$
    SELECT convert_integer(v) AS voltage
        FROM regexp_split_to_table(value, ';') AS v
        WHERE convert_integer(v) IS NOT NULL;
$$ LANGUAGE SQL;

-- Convert a text numeric value into a number. Both the period (.) and the comma (,)
-- are accepted as decimal separators.
-- Trailing text is discarded. Leading text, or any other invalid value, results in a NULL.
CREATE OR REPLACE FUNCTION convert_number(value TEXT) RETURNS NUMERIC
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
AS $$
DECLARE
  parts TEXT[];
  res NUMERIC;
BEGIN
    parts := regexp_matches(value, '^([0-9]+[\.,]?[0-9]*)', '');
    res := replace(parts[1], ',', '.')::NUMERIC;
    RETURN res;
END
$$ LANGUAGE plpgsql;

-- Convert a text integer value into an integer. 
-- Only supports 9-decimal-digit positive integers
CREATE OR REPLACE FUNCTION convert_integer(value TEXT) RETURNS INTEGER
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
AS $$
DECLARE
  parts TEXT[];
BEGIN
    parts := regexp_matches(value, '^([0-9]{1,9})$', '');
    RETURN parts[1];
END
$$ LANGUAGE plpgsql;

-- Get the nth element of a semicolon-delimited list
CREATE OR REPLACE FUNCTION nth_semi(input TEXT, index INTEGER) RETURNS TEXT
PARALLEL SAFE
IMMUTABLE
AS $$
DECLARE
    parts TEXT[];
BEGIN
    parts = string_to_array(input, ';');
    RETURN parts[index];
END
$$ LANGUAGE plpgsql;

-- Get the first element of a semicolon-delimited list
CREATE OR REPLACE FUNCTION first_semi(input TEXT) RETURNS TEXT
PARALLEL SAFE
IMMUTABLE
AS $$
DECLARE
    parts TEXT[];
BEGIN
    RETURN nth_semi(input, 1);
END
$$ LANGUAGE plpgsql;

-- Return an array of voltage values (in kV) for a power line
CREATE OR REPLACE FUNCTION line_voltages(voltage TEXT, circuits INTEGER) RETURNS REAL[]
PARALLEL SAFE
IMMUTABLE
AS $$
DECLARE
    parts TEXT[];
    voltage_tmp INTEGER;
    int_voltages INTEGER[];
    array_size INTEGER;
    retval REAL[];
BEGIN
    parts = string_to_array(voltage, ';');
    IF array_length(parts::anyarray, 1) > 1 THEN
        FOR I IN array_lower(parts::anyarray, 1)..array_upper(parts::anyarray, 1) LOOP
            int_voltages[I] = convert_integer(parts[I]);
        END LOOP;
    ELSIF circuits IS NOT NULL THEN
        voltage_tmp = convert_integer(voltage);
        FOR I IN 1..circuits LOOP
            int_voltages[I] = voltage_tmp;
        END LOOP;
    ELSE
        int_voltages[1] = convert_integer(voltage);
    END IF;

    -- Remove NULLs and sort the array
    int_voltages = sort(array_remove(int_voltages, NULL));
    array_size = array_upper(int_voltages, 1);
    IF array_size = 0 OR array_size IS NULL THEN
        RETURN NULL;
    END IF;

    -- Convert to kV and reverse the sorted array so highest voltage is first.
    FOR I IN 1..array_size LOOP
        retval[array_size - I + 1] = int_voltages[I]::NUMERIC / 1000;
    END LOOP;

    return retval;
END
$$ LANGUAGE plpgsql;

-- Combine two voltage fields into one
CREATE OR REPLACE FUNCTION combine_voltage(a TEXT, b TEXT) RETURNS TEXT
PARALLEL SAFE
IMMUTABLE
AS $$
DECLARE
    parts INT[];
BEGIN
    parts = string_to_array(a, ';')::INT[];
    parts = array_cat(parts, string_to_array(b, ';')::INT[]);
    RETURN array_to_string(public.uniq(public.sort_desc(parts)), ';');
END
$$ LANGUAGE plpgsql;

-- Aggregate to combine voltages into one delimited voltage field
CREATE OR REPLACE AGGREGATE voltage_agg (TEXT)
(
    sfunc = combine_voltage,
    stype = TEXT,
    initcond = '',
    parallel = SAFE
);

-- Combine two fields with a semicolon
CREATE OR REPLACE FUNCTION combine_field(a TEXT, b TEXT) RETURNS TEXT
IMMUTABLE
PARALLEL SAFE
AS $$
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

CREATE OR REPLACE AGGREGATE field_agg (TEXT)
(
    sfunc = combine_field,
    stype = TEXT,
    initcond = '',
    parallel = SAFE
);

CREATE OR REPLACE FUNCTION plant_label(name TEXT, output TEXT, source TEXT) RETURNS TEXT IMMUTABLE AS $$
DECLARE
    out_v INTEGER;
BEGIN
    out_v = round(convert_power(output) / 1e6);
    IF name = '' THEN
        RETURN '';
    ELSIF name != '' AND output = '' AND source = '' THEN
        RETURN name;
    ELSIF name != '' AND output != '' AND source = '' THEN
        RETURN name || E'\n (' || out_v || ' MW)';
    ELSE
        RETURN name || E'\n (' || source || ', ' || out_v || ' MW)';
    END IF;
END
$$ LANGUAGE plpgsql;

-- Get the area of a geometry in square meters.
CREATE OR REPLACE FUNCTION area_sqm(geom GEOMETRY) RETURNS DOUBLE PRECISION
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
BEGIN
	IF ST_GeometryType(geom) != 'ST_Polygon' THEN
		RETURN 0;
	END IF;
	RETURN ST_Area(Geography(ST_Transform(geom, 4326)));
END
$$ LANGUAGE plpgsql;


-- Estimate the output of a generator:type=solar (in watts) from its geometry.
CREATE OR REPLACE FUNCTION solar_output(geom GEOMETRY) RETURNS DOUBLE PRECISION
PARALLEL SAFE
IMMUTABLE
AS $$
DECLARE
BEGIN
	IF ST_GeometryType(geom) = 'ST_Point' THEN
		RETURN 4000; -- Assume point generators have a fixed output of 4 kW
	END IF;
	RETURN area_sqm(geom) * 150; -- 150 W/m^2
END
$$ LANGUAGE plpgsql;

-- Convert a number of modules (as text) into an output (in watts)
CREATE OR REPLACE FUNCTION modules_output(modules TEXT) RETURNS DOUBLE PRECISION
PARALLEL UNSAFE -- uses EXCEPTION which is unsafe
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
DECLARE
BEGIN
	BEGIN
		RETURN modules::INTEGER * 250;
	EXCEPTION WHEN OTHERS THEN
		RETURN NULL;
	END;
END
$$ LANGUAGE plpgsql;

-- Rendering functions

create or replace function ZRes (z integer)
    returns float
    PARALLEL SAFE
    returns null on null input
    language sql immutable as
$func$
select (40075016.6855785/(256*2^z));
$func$;

create or replace function ZRes (z float)
    returns float
    PARALLEL SAFE
    returns null on null input
    language sql immutable as
$func$
select (40075016.6855785/(256*2^z));
$func$;

create or replace function osm_url (tags HSTORE)
    returns text
    PARALLEL SAFE
    immutable
    returns null on null input AS $$
SELECT COALESCE(tags -> 'website', tags -> 'contact:website', tags -> 'url');
$$ LANGUAGE sql;


-- Generate the outline of a distributed power plant
-- ST_ConcaveHull can fail on some geometries. This function tries it, but falls back to a simple buffer otherwise.
CREATE OR REPLACE FUNCTION simplify_boundary(g1 public.geometry)
    RETURNS public.geometry
    LANGUAGE plpgsql
    IMMUTABLE STRICT
    PARALLEL UNSAFE AS $$
begin
    return ST_Buffer(ST_ConcaveHull(g1, 0.95), 10);
EXCEPTION
    WHEN SQLSTATE 'XX000' THEN
        RETURN st_buffer(g1, 10);
end
$$;

-- Given a point on a power line (say the location of a switch),
-- return the angle of the line at that point.
-- Returns null if a line cannot be found.
CREATE OR REPLACE FUNCTION power_line_angle(point GEOMETRY)
    RETURNS DOUBLE PRECISION
    LANGUAGE plpgsql
    IMMUTABLE STRICT
    PARALLEL SAFE
    AS $$
DECLARE
    angle DOUBLE PRECISION;
BEGIN
    -- Interpolate two points onto the line at 20% and 80% of the length, and calculate the angle between them.
    SELECT ST_Azimuth(ST_LineInterpolatePoints(line.geometry, 0.2, false),
                      ST_LineInterpolatePoints(line.geometry, 0.8, false)
                     ) / (2 * PI()) * 360 INTO angle
    FROM (
        -- Fetch all lines within a 1m radius of the point. Clip them to a 5m buffer.
        SELECT ST_Intersection(l.geometry, ST_Buffer(point, 5)) AS geometry
        FROM osm_power_line l
        WHERE ST_Intersects(ST_Buffer(point, 1), l.geometry)
        ORDER BY line = 'busbar' ASC -- Prefer non-busbar lines
    ) AS line
    WHERE ST_GeometryType(line.geometry) = 'ST_LineString' LIMIT 1;
    RETURN angle;
END $$;

CREATE OR REPLACE FUNCTION pipeline_type(substance TEXT)
    RETURNS TEXT
    LANGUAGE sql
    IMMUTABLE STRICT
    PARALLEL SAFE
    AS $$

SELECT CASE
    WHEN substance IN (
        'natural_gas', 'gas', 'oil', 'fuel', 'cng', 'lpg', 'ngl', 'lng',
        'y-grade', 'hydrocarbons', 'hydrogen', 'ethylene', 'ethene', 'propylene', 'propene',
        'methane', 'ethane', 'isobutane', 'butane', 'propane', 'condensate', 'butadiene', 'naphtha'
      ) THEN 'petroleum'
    WHEN substance IN ('water', 'hot_water', 'rainwater', 'wastewater', 'sewage',
        'waterwaste', 'steam') THEN 'water'
    ELSE 'other'
END;

$$;