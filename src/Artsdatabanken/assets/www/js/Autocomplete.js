/**
 * Autocomplete.load(data, callback, errorCallback) is run during initialization.
 * 
 * @returns {Autocomplete}
 */
function Autocomplete(data, callback, errorCallback) {
	var me = this;
	this.prefixFiles = [];
	this.data = [];
	
	this.callback = function(request, response) {
		var currentText = $.ui.autocomplete.escapeRegex(request.term);
		var matcher = new RegExp( "^" + currentText, "i" );
		var count = 0;
		var suggestions = $.grep(me.data, function(item, index){
			if (count > 5) return false;
			var res = matcher.test(item)
			if (res) count++;
			return res;
		});
		response(suggestions);
	};
	
	this.activate = function(inputElement) {
		$(inputElement).autocomplete({
			source: this.callback
		});
	};
	
	this.prefixFile = function(term) {
		// TODO Change this to use regex..
		for (var i = 0; i < me.prefixFiles.length; i++) {
			var prefixes = me.prefixFiles[i][0].split("|");
			for (var j = 0; j < prefixes.length; j++) {
				if (prefixes[j] == term.charAt(0)) {
					return me.prefixFiles[i][1];
				}
			}
		}
	};
	
	this.isMetafile = function(filename) {
		var pattern = /index\.js$/i;
		return pattern.test(filename);
	}
	
	/**
	 * @param data Filename or array of autocompletion values
	 * @param callback Called when file has been loaded, argument with "success" if all is OK
	 * @param callback Called if file can't be loaded (see jQuery.ajax())
	 */
	this.load = function(data, callback, errorCallback) {
		if (data instanceof Array) {
			me.data = data;
			if (callback instanceof Function) {
				callback("success");
			}
		}
		else {
			$.ajax({
				url: data, 
				dataType: "script",
				success: function(fileData, textStatus) {
					eval(fileData);
					if (me.isMetafile(data)) {
						me.prefixFiles = autocompleteData();
					}
					else {
						me.data = autocompleteData();
					}
					if (textStatus == "success") {
						me.data = autocompleteData();
					}
					if (callback instanceof Function) {
						callback(textStatus);
					}
				},
				error: errorCallback
			});
		}
	};
	
	// Construct
	
	this.load(data, callback, errorCallback);
};
