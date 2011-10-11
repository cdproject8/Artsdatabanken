$(document).ready(function(){
	
	module("Autocomplete");
	
	var expectSuggestion = function (term, data, expected) {
		var testRun = false;
		var request = {term: term};
		var response = function(suggestions) {
			equals(suggestions.length, expected.length);
			for (var i = 0; i < suggestions.length; i++) {
				equals(data[i], suggestions[i]);
			}
			testRun = true;
		};
		var ac = new Autocomplete();
		ac.suggestions(data);
		var autocomplete = ac.callback;
		autocomplete(request, response);
		ok(testRun);
	};
	
	test("should return 0 suggestions on no matches", function() {
		var data = [ "taa", "t", "te" ];
		var expected = [ ];
		expectSuggestion("taap", data, expected);
	});
	
	test("should return 3 ordered suggestions on exactly 3 matches", function() {
		var data = [ "taa", "t", "te" ];
		var expected = [ "t", "taa", "te" ];
		expectSuggestion("t", data, expected);
	});

	test("should return 6 ordered suggestions on exactly 6 matches", function() {
		var data = [ "taa", "t", "te", "tes", "testing", "trap" ];
		var expected = [ "t", "taa", "te", "tee", "tes", "testing" ];
		expectSuggestion("t", data, expected);
		expectSuggestion("t", data, expected);
	});
	
	test("should return 6 ordered suggestions on more than 6 matches", function() {
		var data = [ "taa", "t", "te", "tes", "testing", "trap", "tee" ];
		var expected = [ "t", "taa", "te", "tee", "tes", "testing" ];
		expectSuggestion("t", data, expected);
	});
	
	test("should be able to activate autocomplete for input element", function() {
		expect(2);
		var aComplete = new Autocomplete();
		$.fn.autocomplete = function(options) {
			equals(options.source, aComplete.callback);
			equals(this[0], mockElement)
		};
		var mockElement = {id: "mockie"}
		aComplete.activate(mockElement);
	});
	
	test("should be able to load data from array", function() {
		var ac = new Autocomplete();
		var data = [ "one", "two" ];
		ac.suggestions(data);
		equals(ac.suggestions(), data);
	});
	
	asyncTest("should load data from file when constructed with string", function() {
		expect(3);
		var ac = new Autocomplete("resources/autocomplete/autocomplete.js", function(textStatus) {
			equals(ac.suggestions()[0], "a");
			equals(ac.suggestions()[1], "b");
			equals(ac.suggestions()[2], "c");
			start();
		});
	});
	
	asyncTest("should load new prefix file if term can't be matched", function() {
		var ac = new Autocomplete();
		expect(3);
		ac.load('resources/autocomplete/35/index.js', function() {
			var response = function(suggestions) {
				equals(suggestions[0], "berkley");
				var response2 = function(suggestions) {
					equals(suggestions[0],"grape");
					equals(suggestions[1],"grep");
					start();
				};
				ac.callback({term: "gr" }, response2);
			};
			ac.callback({term: "be" }, response);
		});
	});
});