<?php
$xml = simplexml_load_file('download' . DIRECTORY_SEPARATOR .$argv[1]);
$stylesheet = simplexml_load_file(dirname(__FILE__) . DIRECTORY_SEPARATOR .'parser.xsl');
$xslt = new XSLTProcessor();
$xslt->importStylesheet($stylesheet);
file_put_contents( "tmp/{$argv[1]}", preg_replace('/,/', ",\n", $xslt->transformToXml($xml)));
?>
