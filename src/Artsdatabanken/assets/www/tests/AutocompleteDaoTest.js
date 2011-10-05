$(document).ready(function(){
	
	module("AutocompleteDao");
	
	/*
	 * File access
	 */
	
	asyncTest("should be able to load data from file", function() {
		expect(3);
		var ac = new AutocompleteDao([]);
		ac.load("resources/autocomplete/autocomplete.js", function(suggestions) {
			equals(suggestions[0], "a");
			equals(suggestions[1], "b");
			equals(suggestions[2], "c");
			start();
		}, function(a,b,c) {
			console.log(c);
			start();
		});
	});
	
	asyncTest("should be able to load data from file multiple times", function() {
		expect(5);
		var ac = new AutocompleteDao([]);
		ac.load("resources/autocomplete/autocomplete.js", function(suggestions) {
			equals(suggestions[0], "a");
			equals(suggestions[1], "b");
			equals(suggestions[2], "c");
			
			ac.load("resources/autocomplete/autocomplete2.js", function(suggestions) {
				equals(suggestions[0], "test");
				equals(suggestions[1], "testie");
				start();
			});
		});
	});
	
	test("should regard files not ending with index.js as regular data", function() {
		ok(new AutocompleteDao().isMetafile("test") == false);
	});
	
	test("should regard files ending with index.js as meta data", function() {
		ok(new AutocompleteDao().isMetafile("index.js"));
		ok(new AutocompleteDao().isMetafile("22/index.js"));
		ok(new AutocompleteDao().isMetafile("data/22/index.js"));
	});
	
	asyncTest("should load metadata if filename ends with index.js", function() {
		expect(2);
		var ac = new AutocompleteDao();
		ac.load("resources/autocomplete/32/index.js", function(suggestions) {
			equals(ac.prefixFile("a").filename, "a.json");
			equals(ac.prefixFile("bee").filename, "b.json");
			start();
		}, function(a,b,c) {
			console.log(c);
			start();
		});
	});
	
	test("should consider prefix specifications like d|e|f as d or e or f", function() {
		var ac = new AutocompleteDao();
		ac.prefixMap([
    		[ "d|e|f", "d_e_f.json"]
    	]);
		equals(ac.prefixFile("det").filename, "d_e_f.json");
		equals(ac.prefixFile("ee").filename, "d_e_f.json");
		equals(ac.prefixFile("f").filename, "d_e_f.json");
		equals(ac.prefixFile("r").filename, undefined);
	});
	
	test("should consider prefix specifications like [a-c] as a or b or c", function() {
		var ac = new AutocompleteDao();
		ac.prefixMap([
    		[ "[a-c]", "a-c.json"]
    	])
		equals(ac.prefixFile("archie").filename, "a-c.json");
		equals(ac.prefixFile("blarg").filename, "a-c.json");
		equals(ac.prefixFile("car").filename, "a-c.json");
		equals(ac.prefixFile("dar").filename, undefined);
	});
	
	asyncTest("should set categoryRoot to directory above index.js when loaded", function() {
		expect(1);
		var ac = new AutocompleteDao();
		ac.load('resources/autocomplete/35/index.js', function() {
			equals("resources/autocomplete/35", ac.categoryRoot());
			start();
		});
	});
	
	asyncTest("should fail gracefully if loading file by category fails", function() {
		expect(1);
		var ac = new AutocompleteDao();
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
		var ac = new AutocompleteDao();
		
		ac.load('resources/autocomplete/35/index.js', function() {
			ac.loadByTerm('aterm', function(data) {
				equals(data.prefix, '[a-c]');
				equals(data.suggestions[0], 'archie');
				equals(data.suggestions[1], 'berkley');
				equals(data.suggestions[2], 'cab');
				ac.loadByTerm('ge', function(data) {
					equals(data.suggestions[0], 'grape');
					equals(data.suggestions[1], 'grep');
				});
				start();
			}, function(a, b, c) {
				console.log(c);
				start();
			});
		});
	});
});