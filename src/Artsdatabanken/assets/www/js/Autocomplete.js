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
	var dao = new AutocompleteDao();
	
	var state = {
		suggestions: [],
		prefixMap: [],
		currentPrefix: '[a-z0-9]',
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
	
	this.prefixMatch = function(term) {
		var pattern = new RegExp("^"+state.currentPrefix, "i");
		return pattern.test(term);
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
	
	this.currentPrefix = function(data) {
		if (data != null) {
			state.currentPrefix = data;
			return me;
		}
		return state.currentPrefix;
	};

	this.categoryRoot = function(filename) {
		if (filename != null) {
			state.categoryRoot = filename.substring(0, filename.length - "/index.js".length);
			return me;
		}
		return state.categoryRoot;
	};
	
	this.load = function(data, success, error) {
		dao.load(data, function(data) {
			me.suggestions(data);
			if (success instanceof Function) {
				success(data);
			}
		}, error);
	};
	
	// Construct
	
	if (data != null) {
		me.load(data, success, error);
	}
};