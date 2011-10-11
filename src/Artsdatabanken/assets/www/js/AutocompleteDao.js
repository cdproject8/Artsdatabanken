function AutocompleteDao() {
	var me = this;
	
	var state = {
		prefixMap: [],
		categoryRoot: null
	};

	this.loadByTerm = function(term, success, error) {
		var prefixFile = me.prefixFile(term, true);
		me.load(prefixFile.filename, function(suggestions) {
			success({prefix: prefixFile.prefix, suggestions: suggestions})
		}, error);
	};
	
	this.load = function(data, success, error) {
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
					me.prefixMap(state.prefixMap);
					me.categoryRoot(data);
					success([]);
				}
				else if (success instanceof Function){
					success(autocompleteData());
				}
			},
			error: error
		});
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
				return {prefix: state.prefixMap[i][0], filename: state.prefixMap[i][1]};
			}
		}
		return {prefix: '', filename: null};
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
	
	this.prefixMap = function(data) {
		if (data != null) {
			state.prefixMap = data;
			return me;
		}
		return state.prefixMap;
	};
};