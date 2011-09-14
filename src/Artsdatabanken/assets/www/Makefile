JS = libs/phonegap-1.0.0.js libs/jquery-1.6.2.min.js js/main.js libs/jquerymobile/jquery.mobile-1.0b2.min.js libs/jquerymobile/jquery.mobile.datebox.js
CSS = libs/jquerymobile/jquery.mobile-1.0b2.min.css libs/jquerymobile/jquery.mobile.datebox.css libs/touch.artsdatabanken.no/artsdatabanken.css

all: js css

js: .PHONY
	cat $(JS) > js/compiled.js

css: .PHONY
	cat $(CSS) > styles/compiled.css

.PHONY: js/compiled.js styles/compiled.css
