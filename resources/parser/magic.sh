remove_duplicates() { 
	echo '<?xml version="1.0"?>'
	echo '<namelist xmlns:adb="http://artsdatabanken.no/Artsnavnebase">'
	cat $1 | sed -e '1,2d' -e '$d' | sort | uniq
	echo '</namelist>'
}

for file in `ls autocomplete`; do
	remove_duplicates "autocomplete/$file" > "minified/$file"
done
