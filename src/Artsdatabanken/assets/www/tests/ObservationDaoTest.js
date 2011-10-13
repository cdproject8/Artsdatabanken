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
	
	function createExpectRemovedCallback(dao, result, entry_id, observation_id) {
		return function() {
			dao.findEntry(entry_id, observation_id, function(result) {
				ok(result == null, "id should be null");
				start();
			}, error)
		}
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
		var dao = getDao();
		var entry = getEntry();
		entry.id = 3;
		entry.observation.id = 7;
		dao.saveEntry(entry, function(id) {
			entry.id = 5;
			entry.observation.id = 7;
			dao.saveEntry(entry, function(id) {
				dao.findAllEntries({observation_id: 7}, function() {
					start();
				}, error)
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
				dao.removeEntry(id, entry.observation.id, createExpectRemovedCallback(dao, result, id, entry.observation.id));
			}, error)
		}, error);
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
	
	asyncTest("should delete all entries for observation when it's removed", function() {
		ok(false, "test this functionality");
		start();
	});
});