/**
 * Autocomplete.load(data, success, error) is run during initialization.
 * 
 * @returns {Autocomplete}
 */
function Autocomplete(data, success, error) {
	var me = this;
	var dao = new AutocompleteDao();
	
	var state = {
		suggestions: [],
		categoryRoot: null
	};
	
	this.callback = function(request, response) {
		if (!dao.prefixMatch(request.term, dao.currentPrefix())) {
			$(dao.prefixMap()).each(function() {
				if (dao.prefixMatch(request.term, this[0])) {
					dao.loadByTerm(request.term, function(data) {
							me.suggestions(data.suggestions);
							state.prefix = data.prefix;
							me.callbackWithoutFileLoading(request, response);
						},
						function() {
							me.callbackWithoutFileLoading(request, response);
						}
					);
				}
			});
		}
		else {
			me.callbackWithoutFileLoading(request, response);
		}
	};
	
	this.callbackWithoutFileLoading = function(request, response) {
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

	this.categoryRoot = function(filename) {
		if (filename != null) {
			state.categoryRoot = filename.substring(0, filename.length - "/index.js".length);
			return me;
		}
		return state.categoryRoot;
	};
	
	this.load = function(inData, success, error) {
		if (inData instanceof Array) {
			this.suggestions(data);
			return;
		}
		
		dao.load(inData, function(data) {
			me.suggestions(data);
			if (dao.isMetafile(inData)) {
				dao.currentPrefix("$");
			}
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

(function($) {
	$.fn.speciesAutocomplete = function(optionsArg) {
		var options = {
			data: [ ], // Array or filename
			success: function(data) {},
			error: function(data) {},
		};
		$.extend(options, optionsArg);
		var ac = new Autocomplete(options.data, options.success, options.error);
		ac.activate(this);
		return this;
	};
}(jQuery));