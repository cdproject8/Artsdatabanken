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
	
	
	/**
	 * @param selector jQuery selector for input element to be auto-completed
	 */
	this.activate = function(selector) {
		$(selector).autocomplete({
			source: this.callback
		});
	};
	
	/**
	 * @param term Search term
	 * @return Name of file that contains suggestions for term
	 */
	this.prefixFile = function(term) {
		for (var i = 0; i < me.prefixFiles.length; i++) {
			var pattern = new RegExp("^" + me.prefixFiles[i][0], "i");
			if (pattern.test(term)) {
				return me.prefixFiles[i][1];
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
