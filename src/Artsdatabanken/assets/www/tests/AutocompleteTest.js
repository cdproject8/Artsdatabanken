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
		var autocomplete = new Autocomplete(data).callback;
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
		var data = ["one", "two"];
		ac.load(data);
		equals(ac.data, data);
	});
	
	asyncTest("should be able to load data from file", function() {
		expect(4);
		var ac = new Autocomplete([]);
		ac.load("resources/autocomplete.js", function(textStatus) {
			equals(textStatus, "success");
			equals(ac.data[0], "a");
			equals(ac.data[1], "b");
			equals(ac.data[2], "c");
			start();
		});
	});
	
	asyncTest("should be able to load data from file multiple times", function() {
		expect(7);
		var ac = new Autocomplete([]);
		ac.load("resources/autocomplete.js", function(textStatus) {
			equals(textStatus, "success");
			equals(ac.data[0], "a");
			equals(ac.data[1], "b");
			equals(ac.data[2], "c");
			
			ac.load("resources/autocomplete2.js", function(textStatus) {
				equals(textStatus, "success");
				equals(ac.data[0], "test");
				equals(ac.data[1], "testie");
				start();
			});
		});
	});
	
	asyncTest("should load data from file if constructed with string", function() {
		expect(4);
		var ac = new Autocomplete("resources/autocomplete.js", function(textStatus) {
			equals(textStatus, "success");
			equals(ac.data[0], "a");
			equals(ac.data[1], "b");
			equals(ac.data[2], "c");
			start();
		});
	});
});