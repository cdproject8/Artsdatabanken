/**
 * Autocomplete.load(data, callback) is run during initialization.
 * 
 * @returns {Autocomplete}
 */
function Autocomplete(data, callback) {
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
	this.load = function(data, callback) {
		console.log(data);
		console.log(data instanceof Array);
		if (data instanceof Array) {
			console.log("isarray");
			me.data = data;
			if (callback instanceof Function) {
				callback("success");
			}
		}
		else {
			console.log("notarray");
			$.getScript(data, function(data, textStatus) {

				eval(data);
				me.data = autocompleteData();
				if (textStatus == "success") {
					me.data = autocompleteData();
				}
				if (callback instanceof Function) {
					callback(textStatus);
				}
			});
		}
	};
	
	// Construct
	
	this.load(data, callback);
};
