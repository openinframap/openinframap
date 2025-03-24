-- Stats schema used by the web backend:

CREATE SCHEMA stats;

CREATE TABLE stats.power_line (
	id SERIAL PRIMARY KEY,
	time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	country TEXT NOT NULL,
	voltage INTEGER,
	length INTEGER NOT NULL
);

CREATE TABLE stats.power_plant (
	id SERIAL PRIMARY KEY,
	time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	country TEXT NOT NULL,
	source TEXT,
	count INTEGER,
	output BIGINT
);

CREATE TABLE stats.power_generator (
	id SERIAL PRIMARY KEY,
	time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	country TEXT NOT NULL,
	source TEXT,
	count INTEGER,
	output BIGINT
);

CREATE TABLE stats.substation (
	id SERIAL PRIMARY KEY,
	time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	country TEXT NOT NULL,
	voltage INTEGER,
	count INTEGER
);