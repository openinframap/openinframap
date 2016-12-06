CREATE OR REPLACE FUNCTION convert_power(value TEXT) RETURNS NUMERIC AS $$
DECLARE
  parts TEXT[];
  val NUMERIC;
BEGIN
  parts := regexp_matches(value, '([0-9][0-9\.,]+)[ ]?([KMG]?W)?', '');
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

CREATE OR REPLACE FUNCTION convert_voltage(value TEXT) RETURNS NUMERIC AS $$
DECLARE
  parts TEXT[];
BEGIN
  parts := regexp_matches(value, '([0-9][0-9\.,]+)[;]?.*', '');
  RETURN replace(parts[1], ',', '.');
END
$$ LANGUAGE plpgsql;
