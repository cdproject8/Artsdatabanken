<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" 
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:adb="http://artsdatabanken.no/Artsnavnebase"
>

<xsl:template match="/">
	<namelist>
		<xsl:apply-templates select="//adb:Navn | //adb:VitenskapligNavn" />
	</namelist>
</xsl:template>

<xsl:template match="//adb:Navn | //adb:VitenskapligNavn">
	<name><xsl:value-of select="." /></name>
</xsl:template>

</xsl:stylesheet>
