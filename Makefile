SOURCES = $(wildcard *.mss)
OBJECTS = $(SOURCES:.mss=.xml)

all: config $(OBJECTS)

config: layers.yml
	python ./util/generate_mml.py ./layers.yml

clean:
	rm -f *.mml *.xml

%.xml: %.mml %.mss
	magnacarto -mml $<  > $@

.PHONY: config clean
