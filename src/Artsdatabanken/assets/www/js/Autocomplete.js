/**
 * Autocomplete.load(data, callback, errorCallback) is run during initialization.
 * 
 * @returns {Autocomplete}
 */
function Autocomplete(data, callback, errorCallback) {
	var me = this;
	
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
	
	/**
	 * @param data Filename or array of autocompletion values
	 * @param callback Called when file has been loaded, argument with "success" if all is OK
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
				success: function(data, textStatus) {
					eval(data);
					me.data = autocompleteData();
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
	
	this.load(data, callback);
};