#!/bin/bash

categories="$1"
if [ -z "$categories" ]; then
	for (( i = 75; i <= 105; i++ )); do
		categories="$categories $i"
	done
fi

download_one() {
	wget "http://webtjenester.artsdatabanken.no/Artsnavnebase.asmx/Artstre?LatinskNavnID=$1&Dybde=-1" -Odownload/$1.xml
}

minify() { 
	sort $1 | uniq
}

# Download all files
for i in $categories; do
	download_one "$i"
done

# Parse files
for file in `ls download`; do
	php tools/parse.php "$file"
done

# Minify and make into array
for file in `ls tmp`; do
	echo "var autocompleteData = function() {return [ `minify "tmp/$file"` '' ];}" > "autocomplete/`echo $file | sed 's/\.xml/.jsonp/'`"
done
