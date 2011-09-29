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
	
	this.load = function(data, callback) {
		if (data instanceof Array) {
			me.data = data;
			if (callback instanceof Function) {
				callback("success");
			}
		}
		else {
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