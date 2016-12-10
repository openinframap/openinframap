SOURCES = $(wildcard *.mss)
OBJECTS = $(SOURCES:.mss=.xml)

all: config $(OBJECTS)

config: layers.yml
	python ./util/generate_mml.py ./layers.yml

%.xml: %.mml %.mss
	magnacarto -mml $<  > $@
