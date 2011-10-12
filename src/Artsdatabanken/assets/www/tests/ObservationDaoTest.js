$(document).ready(function(){
	module("ObservationDao");

	/*
	 * Helper functions
	 */
	
	function getDao() {
		var daoa = new ObservationDao();
		daoa.uninstall();
		daoa.install();
		return daoa;
	}
	
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
	
	function error(err) {
		console.log(err);
		start();
	}

	function getEntry() {
		return {
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
	};
	
	/*
	 * Tests
	 */

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
		expect(2);
		
		var dao = getDao();
		var entry = getEntry();
		
		// Add entry nr 1
		dao.saveEntry(entry, function(result) {
			dao.findEntry(entry.id, entry.observation.id, function(result) {
				equals(result.species_name, entry.species_name);
				
				// Add entry nr 2
				entry.id = 32;
				entry.species_name = "Small dog";
				dao.saveEntry(entry, function(result) {
					dao.findEntry(entry.id, entry.observation.id, function(result) {
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
	
	asyncTest("should update entry if it exists", function() {
		expect(3);
		var entry = getEntry();
		theDao = getDao();
		theDao.saveEntry(entry, function(id) {
			ok(true, "entry inserted");
			theDao.findEntry(entry.id, entry.observation.id, function(result) {
				equals(result.species_name, entry.species_name);
				entry.species_name = "Small dog";
				theDao.saveEntry(entry, function(id) {
					theDao.findEntry(entry.id, entry.observation.id, function(result) {
						equals(result.species_name, entry.species_name);
						start();
					}, error);
				}, error);
			}, error);
		}, error)
	});
	
	asyncTest("should be able to save and retrieve observations", function() {
		expect(3);
		var obs = {
			id: null,
			longitude: 34.42,
			latitude: 85.31
		};
		var theDao = getDao();
		theDao.saveObservation(obs, function(id) {
			theDao.findObservation(id, function(result) {
				ok(id > 0, "id should be set");
				equals(result.longitude, obs.longitude);
				equals(result.latitude, obs.latitude);
				start();
			}, function(error) {
				console.log(error);
				start();
			});
		});
	});
	
	asyncTest("should update observation if it exists", function() {
		expect(5);
		
		var obs = {
			id: null,
			longitude: 34.42,
			latitude: 85.31
		};
		
		var theDao = getDao();
		theDao.saveObservation(obs, function(id) {
			theDao.findObservation(id, function(result) {
				ok(id > 0, "observation inserted");
				equals(result.longitude, obs.longitude);
				equals(result.latitude, obs.latitude);
				obs.latitude = 11.0;
				obs.id = id;
				theDao.saveObservation(obs, function(id) {
					theDao.findObservation(obs.id, function(result) {
						equals(result.longitude, obs.longitude);
						equals(result.latitude, obs.latitude);
						start();
					}, error);
				}, error);
			}, error);
		});
	});
	
	asyncTest("should be able to delete entries", function() {
		expect(2);
		var dao = getDao();
		var entry = getEntry();
		
		dao.saveEntry(entry, function(id) {
			dao.findEntry(id, entry.observation.id, function(result) {
				console.log(result);
				equals(result.id, id);
				
				dao.removeEntry(id, entry.observation.id, function() {
					dao.findEntry(id, entry.observation.id, function(result) {
						ok(result == null, "id should be null");
						start();
					}, error)
				});
			}, error)
		}, error);
	});
	
	asyncTest("should delete all entries for observation when it's removed", function() {
		ok(false, "test this functionality");
		start();
	});
});