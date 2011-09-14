<?php
$xml = simplexml_load_file($argv[1]);
$stylesheet = simplexml_load_file('parser.xsl');
$xslt = new XSLTProcessor();
$xslt->importStylesheet($stylesheet);
file_put_contents( "autocomplete/{$argv[1]}.xml", preg_replace('/></', ">\n<", $xslt->transformToXml($xml)));
?>
