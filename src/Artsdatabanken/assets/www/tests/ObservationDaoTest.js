$(document).ready(function(){
	module("ObservationDao");

	/*
	 * Helper functions
	 */
	
	function getDao() {
		var dao = new ObservationDao();
		dao.uninstall();
		dao.install();
		return dao;
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
	
	function getObservation() {
		return {
			id: null,
			longitude: 34.42,
			latitude: 85.31,
			create_date: new Date(1234),
			specGroupId: 2,
			exported: true			
		};
	}
	
	function entryEquals(actual, expected) {
		equals(actual.activity, expected.activity);
		equals(actual.age, expected.age);
		equals(actual.comments, expected.comments);
		equals(actual.count, expected.count);
		equals(actual.observation_id, expected.observation.id);
		equals(actual.sex, expected.sex);
		equals(actual.species_name, expected.species_name);
		equals(actual.date_start, expected.date_start.getTime());
		equals(actual.date_end, expected.date_end.getTime());
	}
	
	function saveAndRetrieveEntry(dao, entry, startAsync) {
		dao.saveEntry(entry, function(result) {
			dao.findEntry(entry.id, entry.observation.id, function(result) {
				entryEquals(result, entry);
				if (startAsync) {
					start();
				}
			});
		}, error);
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
		expect(9);
		saveAndRetrieveEntry(getDao(), getEntry(), true);
	});
	
	asyncTest("should update entry if it exists", function() {
		expect(18);
		var entry = getEntry();
		var theDao = getDao();
		theDao.saveEntry(entry, function(id) {
			theDao.findEntry(entry.id, entry.observation.id, function(result) {
				entryEquals(result, entry);
				saveAndRetrieveEntry(theDao, entry, true);
			}, error);
		}, error)
	});
	
	asyncTest("should be able to find multiple entries based on criteria", function() {
		expect(30);
		var dao = getDao();
		var entry = getEntry();
		entry.id = 3;
		entry.observation.id = 7;
		dao.saveEntry(entry, function(id) {
			entry.id = 5;
			entry.observation.id = 7;
			dao.saveEntry(entry, function(id) {
				dao.findAllEntries({observation_id: 7}, function(result) {
					equals(result.length, 2);
					entryEquals(result.item(1), entry);
					entry.id = 2;
					entryEquals(result.item(0), entry);
					dao.findAllEntries({observation_id: 7, limit: 1}, function(result) {
						equals(result.length, 1);
						entryEquals(result.item(0), entry);
						dao.findAllEntries({observation_id: 2}, function(result) {
							equals(result.length, 0);
							start();
						}, error);
					}, error)
				}, error);
			});
		}, error);
	});
	
	asyncTest("should be able to delete entries", function() {
		expect(10);
		var dao = getDao();
		var entry = getEntry();
		
		dao.saveEntry(entry, function(id) {
			dao.findEntry(id, entry.observation.id, function(result) {
				entryEquals(result, entry);
				dao.removeEntry(id, entry.observation.id, function() {
					dao.findEntry(entry.id, entry.observation.id, function(result) {
						equals(result, null);
						start();
					}, error)
				});
			}, error)
		}, error);
	});
	
	asyncTest("should be able to save and retrieve observations", function() {
		expect(5);
		var obs = getObservation();
		var theDao = getDao();
		theDao.saveObservation(obs, function(id) {
			theDao.findObservation(id, function(result) {
				ok(id > 0, "id should be set");
				equals(result.longitude, obs.longitude);
				equals(result.latitude, obs.latitude);
				equals(result.specGroupId, obs.specGroupId);
				equals(result.exported=="true", obs.exported);
				start();
			}, function(error) {
				console.log(error);
				start();
			});
		});
	});
	
	asyncTest("should update observation if it exists", function() {
		expect(5);
		var obs = getObservation();
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
	
	asyncTest("should be able to find multiple observations based on criteria", function() {
		expect(4);
		var obs = getObservation();
		var dao = getDao();
		dao.saveObservation(obs, function(id) {
			dao.saveObservation(obs, function(id) {
				dao.findAllObservations(null, function(result) {
					equals(result.length, 2);
					equals(result.item(0).longitude, 34.42);
					equals(result.item(1).latitude, 85.31);
					equals(result.item(0).create_date, 1234);
					start();
				}, error);
			});
		}, error);
	});
	
	asyncTest("should delete all entries for observation when it's removed", function() {
		var obs = getObservation();
		var dao = getDao();
		dao.saveObservation(obs, function(id) {
			dao.removeObservation(id, function() {
				dao.findObservation(id, function(result) {
					equals(result, null);
					dao.findAllEntries(id, function(result) {
						equals(result.length, 0);
						start();	
					}, error)
				}, error)
			}, error)
		});
	});
});

