CREATE ROLE imposm PASSWORD 'imposm' LOGIN;
CREATE ROLE tegola PASSWORD 'tegola' LOGIN;
CREATE ROLE web_backend PASSWORD 'web_backend' LOGIN;
CREATE DATABASE openinframap OWNER imposm;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO tegola;
GRANT ALL ON SCHEMA countries TO tegola;
GRANT SELECT ON ALL TABLES IN SCHEMA countries TO tegola;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO web_backend;
GRANT ALL ON SCHEMA countries TO web_backend;
GRANT SELECT ON ALL TABLES IN SCHEMA countries TO web_backend;
GRANT ALL ON SCHEMA stats TO web_backend;
GRANT SELECT ON ALL TABLES IN SCHEMA stats TO web_backend;