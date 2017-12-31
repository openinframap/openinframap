SOURCES = $(wildcard *.mss)
OBJECTS = $(SOURCES:.mss=.xml)

%.xml: %.mml %.mss
	magnacarto -mml $<  >$@

all: clean config $(OBJECTS)

config: layers.yml
	python ./util/generate_config.py ./layers.yml

clean:
	rm -f *.mml *.xml

.PHONY: config clean
