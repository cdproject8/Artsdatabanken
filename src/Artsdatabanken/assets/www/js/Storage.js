
var db = null

function dbInit() {
	db = window.openDatabase("testDB", "0.1", "adb testdb", 1048576);
	db.transaction(createDB, dbError);
}

function createDB(tx) {
	
	tx.executeSql('DROP TABLE observations');
	tx.executeSql('DROP TABLE test');
	tx.executeSql('CREATE TABLE IF NOT EXISTS observations (observation_id, observation_row, species, number, location, sex, age, activity, time_start, time_end, date_start, date_end, comments)');
	tx.executeSql('CREATE TABLE IF NOT EXISTS test (data)');
//	alert('database hopefully created?');

}

function dbError(error) {
	alert('Error: ' + error.message);
}

function dbSuccess(tx, results) {
//	console.log(results.rowAffected)
//	alert('success?');
}

function executeQuery(q) {
	function query(tx) {
		tx.executeSql(q);
	}
	console.log(q);
	db.transaction(query, dbError, dbSuccess);

}

function insertObservation(observation_id, observation_row, species, number, location, sex, age, activity, time_start, time_end, date_start, date_end, comments) {
	var v = '';
	v += observation_id + ', ';
	v += observation_row + ', "';
	v += species + '", "';
	v += number + '", "';
	v += location + '", "';
	v += sex + '", "';
	v += age + '", "';
	v += activity + '", "';
	v += time_start + '", "';
	v += time_end + '", "';
	v += date_start + '", "';
	v += date_end + '", "';
	v += comments + '"';
	executeQuery('INSERT INTO observations VALUES (' + v + ')');
}

function updateObservation(observation_id, observation_row, field, value) {
	var result = executeQuery('UPDATE observations SET ' + field + '=' + value + ' WHERE observation_id=' + observation_id + ' AND observation_row=' + observation_row);

}

function testWrite() {
	string = $("#testwrite").val();
	executeQuery('INSERT INTO test VALUES ("' + string + '")');
//	insertObservation(0, 1, 'en fugl', 3, 'nidarø', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
//	updateObservation(0, 1, 'species', '"en fisk"');

}

function testWriteFields(fields, data) {
	function insertString(tx) {
		tx.executeSql('INSERT INTO test (' + fields + ') values ("' + data + '")');
	}
	db.transaction(insertString, dbError, dbSuccess);
}

function testRead() {
	function read(tx) {
		tx.executeSql('SELECT * FROM test', [], readSuccess, dbError);
	}
	function readSuccess(tx, results) {
		$("#testread").val(results.rows.item(results.rows.length-1).data);
//		alert(results.rows.length);
	}
	db.transaction(read, dbError, readSuccess);
}