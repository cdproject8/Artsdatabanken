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
			tx.executeSql('CREATE TABLE IF NOT EXISTS observations (obsid INTEGER PRIMARY KEY AUTOINCREMENT, location)');	
			tx.executeSql('CREATE TABLE IF NOT EXISTS species (spcid INTEGER PRIMARY KEY AUTOINCREMENT, observation_id, species, number, sex, age, activity, time_start INTEGER, time_end INTEGER, comments)');	
			tx.executeSql('CREATE TABLE IF NOT EXISTS test (data)');
		}, errorCallback);
		return me;
	};

	this.db = function(data) {
		if (data != null) {
			db = data;
		}
		return db;
	};

	// Constructor
	
	this.connect();
	this.install();
}
