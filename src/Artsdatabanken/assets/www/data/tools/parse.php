<?php
$xml = simplexml_load_file($argv[1]);
$stylesheet = simplexml_load_file('parser.xsl');
$xslt = new XSLTProcessor();
$xslt->importStylesheet($stylesheet);
$basename = basename($argv[1]);
file_put_contents( "tmp/{$basename}", $xslt->transformToXml($xml));
?>
