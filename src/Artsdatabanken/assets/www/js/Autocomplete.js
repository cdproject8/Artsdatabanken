/**
 * Autocomplete.load(data, success, error) is run during initialization.
 * 
 * @todo Separate data access into DAO class
 * @todo Read new file if prefix is missing (in callback function)
 * 
 * @returns {Autocomplete}
 */
function Autocomplete(data, success, error) {
	var me = this;
	
	var state = {
		suggestions: [],
		prefixMap: [],
		currentPrefix: '',
		categoryRoot: null
	};
	
	this.callback = function(request, response) {
		var currentText = $.ui.autocomplete.escapeRegex(request.term);
		var matcher = new RegExp( "^" + currentText, "i" );
		var count = 0;
		var suggestions = $.grep(state.suggestions, function(item, index){
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
			source: me.callback
		});
		return me;
	};
	
	this.suggestions = function(data) {
		if (data != null) {
			state.suggestions = data;
			return me;
		};
		return state.suggestions;
	};
	
	this.prefixMap = function(data) {
		if (data != null) {
			state.prefixMap = data;
			return me;
		}
		return state.suggestions;
	};
	
	this.currentPrefix = function(data) {
		if (data != null) {
			state.currentPrefix = data;
			return me;
		}
		return state.currentPrefix;
	};
	
	/**
	 * @param term Search term
	 * @param setPrefix if true this instance's current prefix is set
	 * @return Name of file that contains suggestions for term
	 */
	this.prefixFile = function(term, setPrefix) {
		for (var i = 0; i < state.prefixMap.length; i++) {
			var pattern = new RegExp("^" + state.prefixMap[i][0], "i");
			if (pattern.test(term)) {
				if (setPrefix) {
					state.currentPrefix = state.prefixMap[i][0];
				}
				return state.prefixMap[i][1];
			}
		}
	};
	
	this.isMetafile = function(filename) {
		var pattern = /index\.js$/i;
		return pattern.test(filename);
	};
	
	this.categoryRoot = function(filename) {
		if (filename != null) {
			state.categoryRoot = filename.substring(0, filename.length - "/index.js".length);
			return me;
		}
		return state.categoryRoot;
	};
	
	this.loadByTerm = function(term, success, error) {
		var filename = me.prefixFile(term, true);
		me.load(filename, success, error);
	};
	
	/**
	 * @param data Filename or array of autocompletion values
	 * @param success Called when file has been loaded, argument with "success" if all is OK
	 * @param error Called if file can't be loaded (see jQuery.ajax())
	 */
	this.load = function(data, success, error) {
		if (data instanceof Array) {
			state.suggestions = data;
			if (success instanceof Function) {
				success("success");
			}
		}
		else {
			var cr = me.categoryRoot();
			if (cr != null) {
				data = cr + "/" + data;
			}
			
			$.ajax({
				url: data, 
				dataType: "script",
				success: function(fileData, textStatus) {
					eval(fileData);
					if (me.isMetafile(data)) {
						state.prefixMap = autocompleteData();
						me.categoryRoot(data);
					}
					else {
						state.suggestions = autocompleteData();
					}
					if (textStatus == "success") {
						state.suggestions = autocompleteData();
					}
 					if (success instanceof Function) {
						success(textStatus);
					}
				},
				error: error
			});
		}
	};
	
	// Construct
	
	this.load(data, success, error);
};
