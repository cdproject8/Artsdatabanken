<?php
die;
for ($i = 75; $i <= 105; $i++) {
	$xml = simplexml_load_file("http://webtjenester.artsdatabanken.no/Artsnavnebase.asmx/Artstre?LatinskNavnID=$i&Dybde=-1");
	$stylesheet = simplexml_load_file('parser.xsl');
	$xslt = new XSLTProcessor();
	$xslt->importStylesheet($stylesheet);
	file_put_contents( "autocomplete/$i.xml", preg_replace('/></', ">\n<", $xslt->transformToXml($xml)));
}
?>
