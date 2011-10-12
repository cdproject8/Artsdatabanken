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
			tx.executeSql('CREATE TABLE IF NOT EXISTS observations (id INTEGER PRIMARY KEY AUTOINCREMENT, longitude, latitude)');
			tx.executeSql('CREATE TABLE IF NOT EXISTS species (id, observation_id, species_name, count, sex, age, activity, time_start INTEGER, time_end INTEGER, comments, PRIMARY KEY (id, observation_id))');	
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
	
	this.updateEntry = function(entry, success, error) {
		var query = "UPDATE SPECIES SET species_name = ?, count = ?, sex = ?, age = ?, activity = ?, time_start = ?, time_end = ?, comments = ?" + 
		" WHERE id = ? AND observation_id = ?";
		var values = [
			entry.species_name,
			entry.count,
			entry.sex,
			entry.age,
			entry.activity,
			entry.date_start.getTime(), 
			entry.date_end.getTime(),
			entry.comment,
			entry.id,
          	entry.observation.id
		];
		db.transaction(function(tx) {
			tx.executeSql(query, values, function(tx, results) {
				success(entry.id);
			}, null);
		}, error);
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
				success(entry.id);
			}, function(errorArg) {
				me.updateEntry(entry, success, error);
			});
		}, error);
	};
	
	this.findEntry = function(id, observation_id, success, error) {
		db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM species WHERE id = ? AND observation_id = ?', [ id, observation_id ], function(tx, results) {
				if (results.rows.length == 0) {
					success(null);
					return;
				} 
				success(results.rows.item(0));
			}, null)
		}, error)
	};
	
	this.removeEntry = function(id, observation_id, success, error) {
		db.transaction(function(tx) {
			tx.executeSql('DELETE FROM species WHERE id = ? AND observation_id = ?', [id, observation_id], success, error);
		}, null);
	};
	
	this.updateObservation = function(observation, success, error) {
		db.transaction(function(tx) {
			tx.executeSql('UPDATE observations SET longitude = ?, latitude = ? WHERE id = ?', [observation.longitude, observation.latitude, observation.id], function(tx, results) {
				success(observation.id);
			}, error);
		}, null);
	};
	
	this.saveObservation = function(observation, success, error) {
		if (observation.id != null) {
			me.updateObservation(observation, success, error);
			return;
		}
		db.transaction(function(tx) {
			tx.executeSql('INSERT INTO observations (id, longitude, latitude) VALUES (NULL, ?, ?)', [observation.longitude, observation.latitude], function(tx, results) {
				success(results.insertId);
			}, error);
		}, null);
	};
	
	this.findObservation = function(id, success, error) {
		db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM observations WHERE id = ?', [ id ], function(tx, results) {
				success(results.rows.item(0));
			}, null)
		}, error)
	};
	
	this.removeObservation = function(observation_id, success, error) {
		db.transaction(function(tx) {
			tx.executeSql('DELETE FROM species WHERE observation_id = ?', [ observation_id ], success, error);
			tx.executeSql('DELETE FROM observations WHERE id = ?', [ observation_id ], success, error);
		}, null);
	};
	
	// Constructor
	this.connect();
	this.install();
}
