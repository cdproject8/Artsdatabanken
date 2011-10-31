#!/bin/bash

echo -n "This script will remove download/* tmp/* and autocomplete/* before downloading the latest autocomplete files, continue? Yes / No "
read go
if [ "$go" != "Yes" ]; then exit; fi

rm -r download tmp autocomplete
mkdir download tmp autocomplete

#
# Download files
#

download_from_api() {
	ROOT="http://meis.artsdatabanken.no/webtjenesterbeta/databank.asmx/TaxonPropertySearch?terms="
	S="speciesGrouping%3D"
	wget "${ROOT}${S}fugl" -Odownload/1.xml
	wget "${ROOT}${S}karplanter ${S}alger {$S}lav" -Odownload/2.xml
	wget "${ROOT}${S}fisk" -Odownload/3.xml
	url="${S}Svamper ${S}koralldyr ${S}Leddormer ${S}Krepsdyr ${S}Mangeføttinger ${S}Døgnfluer"
	url="${url} ${S}øyenstikkere ${S}steinfluer ${S}vårfluer ${S}Rettvinger ${S}kakerlakker"
	url="${url} ${S}saksedyr ${S}Nebbmunner ${S}Nebbfluer ${S}kamelhalsfluer ${S}mudderfluer"
	url="${url} ${S}nettvinger ${S}Biller ${S}Sommerfugler ${S}Tovinger ${S}Veps ${S}Spretthaler"
	url="${url} ${S}Edderkoppdyr ${S}Mosdyr ${S}Armfotinger ${S}pigghuder ${S}kappedyr"
	wget "${ROOT}${url}" -Odownload/4.xml
	wget "${ROOT}${S}Amfibier ${S}reptiler ${S}pattedyr" -Odownload/5.xml
}

download_from_api
echo "Files downloaded"

#
# Parse files
#

for file in `ls download`; do
	php parse.php "download/$file"
done

#
# Minify and build array
#

minify() { 
	sort $1 | uniq
}

for file in `ls tmp`; do
	echo "var autocompleteData = function() {return [ `minify "tmp/$file"` '' ];}" > "autocomplete/`echo $file | sed 's/\.xml/.js/'`"
done

# Remove temporary stuffs
rm -R tmp download

echo "Download complete. Copy autocomplete/* into APP/data/autocomplete to upgrade the app."