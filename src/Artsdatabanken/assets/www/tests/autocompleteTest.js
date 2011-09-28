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
		var autocomplete = new Autocomplete(data);
		autocomplete(request, response);
		ok(testRun);
	};
	
	test("should return 0 suggestions on no matches", function() {
		data = [ "taa", "t", "te" ];
		expected = [ ];
		expectSuggestion("taap", data, expected);
	});
	
	test("should return 3 ordered suggestions on exactly 3 matches", function() {
		data = [ "taa", "t", "te" ];
		expected = [ "t", "taa", "te" ];
		expectSuggestion("t", data, expected);
	});

	test("should return 6 ordered suggestions on 6 or more matches", function() {
		data = [ "taa", "t", "te", "tes", "testing", "trap", "tee" ];
		expected = [ "t", "taa", "te", "tee", "tes", "testing" ];
		expectSuggestion("t", data, expected);
		data.shift();
		expectSuggestion("t", data, expected);
	});
});