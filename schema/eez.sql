-- Views over the marineregions.org EEZ boundaries (countries.country_eez),
-- which scripts/build-region.sh imports with shp2pgsql.
-- ST_Subdivide improves indexing performance for point-in-country lookups.

DROP MATERIALIZED VIEW IF EXISTS countries.country_eez_sub;
DROP MATERIALIZED VIEW IF EXISTS countries.country_eez_3857;

CREATE MATERIALIZED VIEW countries.country_eez_sub AS
    SELECT country_eez.gid,
        country_eez."union",
        country_eez.mrgid_eez,
        country_eez.territory1,
        country_eez.mrgid_ter1,
        country_eez.iso_ter1,
        country_eez.iso_sov1,
        country_eez.pol_type,
        ST_Subdivide(ST_Transform(country_eez.geom, 3857)) AS geom
    FROM countries.country_eez
    WHERE country_eez."union"::text <> 'Antarctica'::text;

CREATE INDEX country_eez_sub_geom     ON countries.country_eez_sub USING GIST (geom);
CREATE INDEX country_eez_sub_iso_sov1 ON countries.country_eez_sub(iso_sov1);
CREATE INDEX country_eez_sub_iso_ter1 ON countries.country_eez_sub(iso_ter1);

CREATE MATERIALIZED VIEW countries.country_eez_3857 AS
    SELECT country_eez.gid,
        country_eez."union",
        country_eez.mrgid_eez,
        country_eez.territory1,
        country_eez.mrgid_ter1,
        country_eez.iso_ter1,
        country_eez.iso_sov1,
        country_eez.pol_type,
        ST_Transform(country_eez.geom, 3857) AS geom
    FROM countries.country_eez
    WHERE country_eez."union"::text <> 'Antarctica'::text;

CREATE INDEX country_eez_3857_geom ON countries.country_eez_3857 USING GIST (geom);
