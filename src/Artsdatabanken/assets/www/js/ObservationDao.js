function ObservationDao() {
	var me = this;
	var db = null;
	
	this.connect = function() {
		db = window.openDatabase("observations", "", "ObservationsDB", 1048576);
		return me;
	};
	
	this.migrate = function(error) {
		// changeVersion does not work properly on all versions of Android
		if (error == null) {error = function() { }};
		me.install(error);
	}

	this.install = function(errorCallback) {
		if (errorCallback == null) {errorCallback = function() {}};
		db.transaction(function(tx) {
			tx.executeSql('CREATE TABLE IF NOT EXISTS observations (id INTEGER PRIMARY KEY AUTOINCREMENT, longitude, latitude, specGroupId, exported, create_date)');
			tx.executeSql('CREATE TABLE IF NOT EXISTS species (id, observation_id, species_name, count, sex, age, activity, date_start INTEGER, date_end INTEGER, comment, PRIMARY KEY (id, observation_id))');
			tx.executeSql('CREATE TABLE IF NOT EXISTS pictures (id INTEGER PRIMARY KEY AUTOINCREMENT, observation_id, species_id, uri)');
			tx.executeSql('CREATE TABLE IF NOT EXISTS test (data)');
		}, errorCallback);
		return me;
	};
	
	this.uninstall = function(error) {
		if (error == null) {error = function() {}};
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
		console.log("saveEntry");
		if (success == null) {success = function() {}};
		if (error == null) {error = function() {}};
		var query = "INSERT OR REPLACE INTO SPECIES VALUES (?,?,?,?,?,?,?,?,?,?)";
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
			}, function() {
				console.log("error: insert into species")
			});
			
			console.log("pic len " + entry.pictures.length)
			var pics = new Array();
			for(var i = 0; i < entry.pictures.length; i++) {
				if(entry.pictures[i][1] == 1)
					entry.pictures[i][1] = 0;
					pics.push(entry.pictures[i][0]);
			}
			for(var i = 0; i < pics.length; i++) {
				console.log("hallo!");		
				console.log("obsid: " + entry.observation.id);
				console.log("eid: " + entry.id);
				console.log("url: " + entry.pictures[i]);
				tx.executeSql("INSERT INTO pictures VALUES (NULL, ?, ?, ?)", [entry.observation.id, entry.id, pics[i]], function(tx, results) {
					console.log("success");
					success(entry.id);
				}, function(error) {
					console.log("error: " + error);
				});				
			}
		}, error);
	};
	
	this.findEntry = function(id, observation_id, success, error) {
		if (success == null) {success = function() {}};
		if (error == null) {error = function() {}};
		db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM species WHERE id = ? AND observation_id = ?', [ id, observation_id ], function(tx, results) {
				if (results.rows.length == 0) {
					success(function() {});
					return;
				} 
				success(results.rows.item(0));
			}, function() {})
		}, error);
	};
	
	this.findAllEntries = function(criteria, success, error) {
		if (success == null) {success = function() {}};
		if (error == null) {error = function() {}};
		var sql = 'SELECT * FROM species WHERE observation_id = ? ORDER BY id';
		var values = [ criteria.observation_id ];
		if (criteria.limit != null) {
			sql = sql + ' LIMIT ?';
			values[1] = criteria.limit;
		}
		
		db.transaction(function(tx) {
			tx.executeSql(sql, values, function(tx, results) {
				success(results.rows);
			}, function() {})
		}, error);
	};
	
	this.findPictures = function(observation_id, success, error) {
		console.log("findPictures");
		if (success == null) {success = function() {}};
		if (error == null) {error = function() {}};
		
		db.transaction(function(tx) {
			console.log("findPictures: transaction")
			console.log(observation_id);
			tx.executeSql('SELECT * FROM pictures WHERE observation_id = ?', [ observation_id ], function(tx, results) {
				if (results.rows.length == 0) {
					console.log("no results");
					success(function() {});
					return;
				} 
				console.log("findPictures: success");
				for(var i = 0; i < results.rows.length; i++) {
					console.log(results.rows.item(i).uri);
				}
				success(results.rows);
			}, function() {
				console.log("findPictures: error");
			})
		}, error);
		
	}
	
	this.countObservation = function(obsId, success, error) {
		if (success == null) {success = function() {}};
		if (error == null) {error = function() {}};
		var sql = 'SELECT count(*) AS num FROM species WHERE observation_id = ?';
		var values = [ obsId ];		
		db.transaction(function(tx) {
			tx.executeSql(sql, values, function(tx, results) {
				success(results.rows);
			}, function() {})
		}, error);
	};
	
	this.removeEntry = function(id, observation_id, success, error) {
		if (success == null) {success = function() {}};
		if (error == null) {error = function() {}};
		db.transaction(function(tx) {
			tx.executeSql('DELETE FROM species WHERE id = ? AND observation_id = ?', [id, observation_id], success, error);
		}, function() {});
	};
	
	this.updateObservation = function(observation, success, error) {
		if (success == null) {success = function() {}};
		if (error == null) {error = function() {}};
		db.transaction(function(tx) {
			tx.executeSql('UPDATE observations SET longitude = ?, latitude = ?, specGroupId = ?, exported = ? WHERE id = ?', [observation.longitude, observation.latitude, observation.specGroupId, observation.exported, observation.id], function(tx, results) {
				success(observation.id);
			}, error);
		}, function() {});
	};
	
	this.saveObservation = function(observation, success, error) {
		if (success == null) {success = function() {}};
		if (error == null) {error = function() {}};
		if (observation.id != null) {
			me.updateObservation(observation, success, error);
			return;
		}
		
		db.transaction(function(tx) {
			tx.executeSql('INSERT INTO observations (id, longitude, latitude, specGroupId, exported, create_date) VALUES (NULL, ?, ?, ?, ?, ?)', [observation.longitude, observation.latitude, observation.specGroupId, observation.exported, observation.create_date.getTime()], function(tx, results) {
				success(results.insertId);
			}, error);
		}, function() {});
	};
	
	this.findObservation = function(id, success, error) {
		if (success == null) {success = function() {}};
		if (error == null) {error = function() {}};
		db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM observations WHERE id = ?', [ id ], function(tx, results) {
				if (results.rows.length == 0) {
					success(null);
					return;
				} 
				success(results.rows.item(0));
			}, function() {})
		}, error);
	};
	
	this.findAllObservations = function(criteria, success, error) {
		if (success == null) {success = function() {}};
		if (error == null) {error = function() {}};
		db.transaction(function(tx) {
			tx.executeSql('SELECT * FROM observations', [], function(tx, results) {
				success(results.rows);
			}, function() {
				console.log("error: findAllObservations");
			})
		}, error);
	};
	
	this.removeObservation = function(observation_id, success, error) {
		if (success == null) {success = function() {}};
		if (error == null) {error = function() {}};
		db.transaction(function(tx) {
			tx.executeSql('DELETE FROM species WHERE observation_id = ?', [ observation_id ], success, error);
			tx.executeSql('DELETE FROM observations WHERE id = ?', [ observation_id ], success, error);
		}, function() {});
	};
	
	// Constructor
	this.connect();
	this.migrate(function(err) {console.log(err)});
}
