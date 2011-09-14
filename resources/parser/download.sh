download_one() {
	wget "http://webtjenester.artsdatabanken.no/Artsnavnebase.asmx/Artstre?LatinskNavnID=$1&Dybde=-1" -Odownload/$1.xml
}

for i in "$1"; do
	download_one $i
done
