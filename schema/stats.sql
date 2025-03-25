-- Stats schema used by the web backend:

CREATE SCHEMA stats;

CREATE TABLE stats.power_line (
	id SERIAL PRIMARY KEY,
	time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	country TEXT NOT NULL,
	voltage INTEGER,
	length INTEGER NOT NULL
);
CREATE INDEX power_line_country ON stats.power_line(country);

-- Power plants, grouped by output. (Note you need to sum(count * output) to get the total)
CREATE TABLE stats.power_plant (
	id SERIAL PRIMARY KEY,
	time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	country TEXT,  -- NULL for backfilled global stats
	source TEXT,
	count INTEGER,
	output BIGINT
);
CREATE INDEX power_plant_country ON stats.power_line(country);

CREATE TABLE stats.power_generator (
	id SERIAL PRIMARY KEY,
	time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	country TEXT, -- NULL for backfilled global stats
	source TEXT,
	count INTEGER,
	output BIGINT
);
CREATE INDEX power_generator_country ON stats.power_line(country);

CREATE TABLE stats.substation (
	id SERIAL PRIMARY KEY,
	time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	country TEXT, -- NULL for backfilled global stats
	voltage INTEGER,
	count INTEGER
);
CREATE INDEX power_substation_country ON stats.power_line(country);