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
	this.prefixFiles = [];
	this.data = [];
	this.dCategoryRoot = null;
	
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
			source: me.callback
		});
	};
	
	/**
	 * @param term Search term
	 * @return Name of file that contains suggestions for term
	 */
	this.prefixFile = function(term, setPrefix) {
		for (var i = 0; i < me.prefixFiles.length; i++) {
			var pattern = new RegExp("^" + me.prefixFiles[i][0], "i");
			if (pattern.test(term)) {
				if (setPrefix) {
					me.currentPrefix = me.prefixFiles[i][0];
				}
				return me.prefixFiles[i][1];
			}
		}
	};
	
	this.isMetafile = function(filename) {
		var pattern = /index\.js$/i;
		return pattern.test(filename);
	};
	
	this.categoryRoot = function(filename) {
		if (filename != null) {
			me.dCategoryRoot = filename.substring(0, filename.length - "/index.js".length);
		}
		return me.dCategoryRoot;
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
			me.data = data;
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
						me.prefixFiles = autocompleteData();
						me.categoryRoot(data);
					}
					else {
						me.data = autocompleteData();
					}
					if (textStatus == "success") {
						me.data = autocompleteData();
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
