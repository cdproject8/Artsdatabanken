// TODO App class into separate file
var App = {
	VERSION: 0.2
};

function ObservationDao() {
	var me = this;
	var db = null;
	
	this.connect = function() {
		db = window.openDatabase("observations", App.VERSION, "ObservationsDB", 1048576);
		return me;
	};

	this.install = function(errorCallback) {
		db.transaction(function(tx) {
			tx.executeSql('CREATE TABLE IF NOT EXISTS observations (id INTEGER PRIMARY KEY AUTOINCREMENT, location)');
			tx.executeSql('CREATE TABLE IF NOT EXISTS species (spcid, observation_id, species, number, sex, age, activity, time_start INTEGER, time_end INTEGER, comments, PRIMARY KEY (spcid, observation_id))');	
			tx.executeSql('CREATE TABLE IF NOT EXISTS test (data)');
		}, errorCallback);
		return me;
	};
	
	this.uninstall = function(error) {
		db.transaction(function(tx) {
			tx.executeSql('DROP TABLE observations');
			tx.executeSql('DROP TABLE species');	
			tx.executeSql('DROP TABLE test');
		}, error);
		return me;
	};

	this.db = function(data) {
		if (data != null) {
			db = data;
		}
		return db;
	};
	
	this.saveEntry = function(entry, success, error) {
		var query = "INSERT INTO SPECIES VALUES (?,?,?,?,?,?,?,?,?,?)";
		var values = [
		    entry.id,
          	entry.observation.id,
			entry.species_name,
			entry.count,
			entry.sex,
			entry.age,
			entry.activity,
			entry.date_start.getTime(), 
			entry.date_end.getTime(),
			entry.comment
		];
		db.transaction(function(tx) {
			tx.executeSql(query, values, function(tx, results) {
				success(results.insertId);
			}, null);
		}, error);
	};
	
	this.findEntry = function(id, success, error) {
		db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM species WHERE spcid=' + id, [], function(tx, results) {
				success({species_name: results.rows.item(0).species});
			}, null)
		}, error)
	};

	// Constructor
	this.connect();
	this.install();
}
