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
	
	/*
	 * File access
	 */
	
	asyncTest("should be able to load data from file", function() {
		expect(4);
		var ac = new Autocomplete([]);
		ac.load("resources/autocomplete/autocomplete.js", function(textStatus) {
			equals(textStatus, "success");
			equals(ac.data[0], "a");
			equals(ac.data[1], "b");
			equals(ac.data[2], "c");
			start();
		}, function(a,b,c) {
			console.log(c);
			start();
		});
	});
	
	asyncTest("should be able to load data from file multiple times", function() {
		expect(7);
		var ac = new Autocomplete([]);
		ac.load("resources/autocomplete/autocomplete.js", function(textStatus) {
			equals(textStatus, "success");
			equals(ac.data[0], "a");
			equals(ac.data[1], "b");
			equals(ac.data[2], "c");
			
			ac.load("resources/autocomplete/autocomplete2.js", function(textStatus) {
				equals(textStatus, "success");
				equals(ac.data[0], "test");
				equals(ac.data[1], "testie");
				start();
			});
		});
	});
	
	asyncTest("should load data from file if constructed with string", function() {
		expect(4);
		var ac = new Autocomplete("resources/autocomplete/autocomplete.js", function(textStatus) {
			equals(textStatus, "success");
			equals(ac.data[0], "a");
			equals(ac.data[1], "b");
			equals(ac.data[2], "c");
			start();
		});
	});
	
	test("should regard files not ending with index.js as regular data", function() {
		var ac = new Autocomplete();
		ok(ac.isMetafile("test") == false);
	});
	
	test("should regard files ending with index.js as meta data", function() {
		ok(new Autocomplete().isMetafile("index.js"));
		ok(new Autocomplete().isMetafile("22/index.js"));
		ok(new Autocomplete().isMetafile("data/22/index.js"));
	});
	
	asyncTest("should load metadata if filename ends with index.js", function() {
		expect(3);
		var ac = new Autocomplete("resources/autocomplete/32/index.js", function(textStatus) {
			equals(textStatus, "success");
			equals(ac.prefixFile("a"), "a.json");
			equals(ac.prefixFile("bee"), "b.json");
			start();
		}, function(a,b,c) {
			console.log(c);
			start();
		});
	});
	
	test("should consider prefix specifications like d|e|f as d or e or f", function() {
		var ac = new Autocomplete();
		ac.prefixFiles =  [
    		[ "d|e|f", "d_e_f.json"]
    	];
		equals(ac.prefixFile("det"), "d_e_f.json");
		equals(ac.prefixFile("ee"), "d_e_f.json");
		equals(ac.prefixFile("f"), "d_e_f.json");
		equals(ac.prefixFile("r"), undefined);
	});
	
	test("should consider prefix specifications like [a-c] as a or b or c", function() {
		var ac = new Autocomplete();
		ac.prefixFiles =  [
    		[ "[a-c]", "a-c.json"]
    	];
		equals(ac.prefixFile("archie"), "a-c.json");
		equals(ac.prefixFile("blarg"), "a-c.json");
		equals(ac.prefixFile("car"), "a-c.json");
		equals(ac.prefixFile("dar"), undefined);
	});
	
	asyncTest("should set categoryRoot to directory above index.js when loaded", function() {
		expect(1);
		var ac = new Autocomplete();
		ac.load('resources/autocomplete/35/index.js', function() {
			equals("resources/autocomplete/35", ac.categoryRoot());
			start();
		});
	});
	
	asyncTest("should fail gracefully if loading file by category fails", function() {
		expect(1);
		var ac = new Autocomplete();
		ac.categoryFolder = 'resources/autocomplete/35';
		ac.load('resources/autocomplete/35/index.js', function() {
			ac.loadByTerm('no', function() {
			}, function(a, b, c) {
				ok(true);
				start();
			});
		});
	});
	
	asyncTest("should be able to load file based on prefix", function() {
		expect(6);
		var ac = new Autocomplete();
		
		ac.categoryFolder = 'resources/autocomplete/35';
		ac.load('resources/autocomplete/35/index.js', function() {
			ac.loadByTerm('aterm', function() {
				equals(ac.currentPrefix, '[a-c]');
				equals(ac.data[0], 'archie');
				equals(ac.data[1], 'berkley');
				equals(ac.data[2], 'cab');
				ac.loadByTerm('ge', function() {
					equals(ac.data[0], 'grape');
					equals(ac.data[1], 'grep');
				});
				start();
			}, function(a, b, c) {
				console.log(c);
				start();
			});
		});
	});
});