SOURCES = $(wildcard *.mml)
OBJECTS = $(SOURCES:.mml=.xml)

all: $(OBJECTS)

%.xml: %.mml %.mss
	magnacarto -mml $<  > $@
