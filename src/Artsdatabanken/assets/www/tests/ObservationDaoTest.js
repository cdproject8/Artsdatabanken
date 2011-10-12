$(document).ready(function(){
	module("ObservationDao");

	function expectTable(tableName, callback) {
		var dao = new ObservationDao();
		dao.db().transaction(function (tx) { 
			tx.executeSql('SELECT * FROM observations', [], function(result) {
				ok(true, tableName + " table exists");
				callback();
			}, function(err) {
				ok(false, tableName + " table missing");
				callback();
			});
		});
	}

	test("should be able to connect to database", function() {
		var dao = new ObservationDao();
		ok(dao.connect().db().version, "Database has version property");
	});

	asyncTest("should create observations table on install", function() {
		expect(2);
		expectTable("observation", function() {
			expectTable("species", function() {
				start();
			});
		});
	});

	asyncTest("should be able to save and retrieve observation entry", function() {
		var dao = new ObservationDao();

		dao.uninstall();
		dao.install();
		expect(2);
		var entry = {
			observation: {id: 1},
			id: 2,
			species_name: "Big dog",
			count: 12,
			sex: "Male",
			age: 11,
			activity: "Sleeping",
			date_start: new Date(1234), 
			date_end: new Date(4321),
			comment: "This is a comment"
		};
		
		// Add entry nr 1
		dao.saveEntry(entry, function(result) {
			dao.findEntry(entry.id, function(result) {
				console.log(result);
				equals(result.species_name, entry.species_name);
				
				// Add entry nr 2
				entry.id = 32;
				entry.species_name = "Small dog";
				dao.saveEntry(entry, function(result) {
					dao.findEntry(entry.id, function(result) {
						equals(result.species_name, entry.species_name);
						start();
					});
				}, function(error) {
					start();
				});
			});
		}, function(error) {
			console.log(error);
			start();
		});
	});
});
