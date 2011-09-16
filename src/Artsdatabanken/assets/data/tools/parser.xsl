<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" 
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:adb="http://artsdatabanken.no/Artsnavnebase"
>
<xsl:output omit-xml-declaration="yes" />

<xsl:template match="/">
	<xsl:apply-templates select="//adb:Navn | //adb:VitenskapligNavn" />
</xsl:template>

<xsl:template match="//adb:Navn | //adb:VitenskapligNavn">'<xsl:value-of select="." />', 
</xsl:template>

</xsl:stylesheet>
