# coding=utf-8
from __future__ import division, absolute_import, print_function, unicode_literals
import sys
import re
from sqlalchemy import create_engine, text
from fastkml import kml

engine = create_engine('postgresql://localhost')
conn = engine.connect()

CREATE = [
    'DROP TABLE IF EXISTS microwave_link',
    'DROP TABLE IF EXISTS microwave_operator',
    'CREATE TABLE microwave_operator(id SERIAL NOT NULL PRIMARY KEY, name TEXT, type TEXT)',
    '''CREATE TABLE microwave_link(ref TEXT,
        operator INTEGER REFERENCES microwave_operator(id))''',
    "SELECT AddGeometryColumn('microwave_link', 'geometry', 3857, 'LINESTRING', 3)"
]

TELCO = {
    'Bt',
    'Arqiva Limited',
    'Arqiva Services Limited',
    'Ntl National Networks Limited',
    'Vodafone Limited',
    'EE Limited',
    'Airwave Solutions Limited',
    'Mobile Broadband Network Limited as Agent of Everything Everywhere and Hutchison 3G UK Limited',
    'Telefonica UK Limited',
    'Metronet (UK) Limited',
    'Eircom UK Limited',
    'Mll Telecom Ltd',
    'Jersey Airtel Limited',
    'MP & E TRADING COMPANY LIMITED',
    'Verizon Uk Limited',
    'Ingenitech Ltd',
    'Rapid Computers Ltd',
    'Zycomm Electronics Limited',
    'Projex Cellular Infrastructure UK Ltd',
    'Urban Wimax Limited',
    'Sure (Isle of Man) Limited',
    'Sure (Jersey) Limited',
    'Sure (Guernsey) Limited',
    'Scot-Tel Ltd',
    'Airspeed Telecom',
    'AB Internet Ltd',
    'Guernsey Airtel Limited',
}

UTILITY = {
    'Joint Radio Company Ltd'
}

DEFENCE = {
    'BAE Systems Surface Ships Ltd',
    'Qinetiq Group Plc'
}

FINANCIAL = {
    'World Class Wireless LLC',
    'Vigilant Global UK Limited',
    'Goldman Sachs Property Management Limited',
    'Flow Traders B.V.',
    'Optiver Holding B.V.',
    'New Line Networks LLC',
    'Latent Networks Limited',
    'Mckay Brothers International SA',
    'Mckay Brothers Communications Ltd',
    'Smartable LLC',
    'Aviat Networks UK Ltd',
    'Decyben'
}

PETROLEUM = {
    'CENTRICA NORTH SEA GAS LIMITED ',
    'Centrica North Sea Limited',
    'Centrica Production Nederland BV',
    'Hydrocarbon Resources Limited',
    'Nexen Petroleum UK Limited',
    'Nexen Petroleum Uk Limited',
    'Shell UK Limited',
    'Shell U.K. Exploration & Production Limited',
    'Conocophillips (UK) Limited',
    'Conocophillips (UK) Britannia Limited',
    'Tampnet As',
    'Central North Sea Fibre Telecommunications Company Ltd',
    'DONG Energy West of Duddon Sands (UK) Limited',
    'DONG Energy Burbo Extension (UK) Ltd',
    'Dong Energy RB (UK) Ltd',
    'Maersk Oil North Sea Uk Ltd',
    'E.ON E&P UK Limited',
    'Bp Exploration',
    'Centrica Storage Limited',
    'Perenco Uk Limited',
    'Marathon Oil UK LLC',
    'CENTRICA NORTH SEA GAS LIMITED',
    'Chevron North Sea Limited',
}

TRANSPORT = {
    'Aquila Air Traffic Management Services Limited',
    'PORT OF LONDON AUTHORITY',
    'Nats (En Route) Plc',
    'Vts Centre',
    'Network Rail Infrastructure Limited',
    'MARITIME AND COASTGUARD AGENCY',
    'East Midlands International Airport Limited',
    'Milford Haven Port Authority',
    'Associated British Ports',
    'Queens Harbour Master Plymouth',
    'The Mersey Docks & Harbour Company',
    'Newcastle International Airport Limited'
}

LGOV = {
    'Cheshire West and Chester',
    'Highlands and Islands Enterprise'
}


def categorise(operator):
    if operator in TELCO:
        return 'telco'
    if operator in FINANCIAL:
        return 'finance'
    if operator in DEFENCE:
        return 'defence'
    if operator in PETROLEUM:
        return 'petroleum'
    if operator in TRANSPORT:
        return 'transport'
    if re.search('(electricity|water)', operator, re.I) or operator in UTILITY:
        return 'utility'
    if re.search('(police|constabulary)', operator, re.I):
        return 'police'
    if re.search('(council|london borough)', operator, re.I) or operator in LGOV:
        return 'local_government'
    if re.search(' fm ', operator, re.I):
        return 'broadcast'
    return None


k = kml.KML()
with open(sys.argv[1], 'rb') as f:
    k.from_string(f.read())

kml = list(k.features())[0]

with engine.begin():
    for stmt in CREATE:
        conn.execute(text(stmt))

    for folder in kml.features():
        res = conn.execute(text('''INSERT INTO microwave_operator(name, type)
                                    VALUES (:name, :type) RETURNING id'''),
                           name=folder.name, type=categorise(folder.name))
        operator = res.fetchone()[0]
        for feat in folder.features():
            conn.execute(text('''INSERT INTO microwave_link (ref, operator, geometry) VALUES
                              (:ref, :operator,
                            ST_Transform(ST_SetSRID(ST_GeomFromText(:geometry), 4326), 3857)
                                )
                              '''), ref=feat.name, operator=operator, geometry=feat.geometry.wkt)
