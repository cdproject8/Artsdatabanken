
var db = null

function dbInit() {
	db = window.openDatabase("testDB", "0.1", "adb testdb", 1048576);
	db.transaction(function(tx) {
		tx.executeSql('DROP TABLE observations');
		tx.executeSql('DROP TABLE test');
		tx.executeSql('CREATE TABLE IF NOT EXISTS observations (observation_id, observation_row, species, number, location TEXT, sex, age, activity, time_start, time_end, date_start, date_end, comments)');
		tx.executeSql('CREATE TABLE IF NOT EXISTS test (data)');
	}, dbError);
	
	//testdata:
	insertObservation(0, 1, 'en fugl', 3, 'artsdatabankens hage', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
	insertObservation(0, 2, 'en fisk', 3, 'artsdatabankens hage', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
	insertObservation(1, 1, 'pikachu', 3, 'nidar\u00F8', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
	insertObservation(1, 2, 'charmander', 3, 'nidar\u00F8', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
	insertObservation(1, 3, 'squirtle', 3, 'nidar\u00F8', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
	
}

function dbError(error) {
	alert('Error: ' + error.message);
}

var dbSuccess = function(tx, results) {

//	alert('success?');
}

function executeQuery(q) {
	function query(tx) {
		tx.executeSql(q, [], qSuccess, qError);
	}
	
	function qSuccess(tx, results) {
	}
	
	function qError(error) {
		alert(error.message);
	}
	
	db.transaction(query, dbError, dbSuccess);
	console.log(q);
}

function executeQuery(q, success) {
	function query(tx) {
		tx.executeSql(q, [], success, qError);
	}

	function qError(error) {
		alert(error.message);
	}
	
	db.transaction(query, dbError, dbSuccess);
	console.log(q);
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
	executeQuery('UPDATE observations SET ' + field + '=' + value + ' WHERE observation_id=' + observation_id + ' AND observation_row=' + observation_row, function(tx, results) {
		console.log('rows affected: ' + results.rowsAffected)
	});
}

function populateObservationList() {
	executeQuery('SELECT * FROM observations', function(tx, results) {
		for(i = 0; i < results.rows.length; i++){
			htmlstring =  '<li>';
			htmlstring += '<a href="">';
			htmlstring += '<h3>' + results.rows.item(i).species + '</h3>';
			htmlstring += '<p>' + results.rows.item(i).location + ', ' + results.rows.item(i).date_start + ' ' + results.rows.item(i).time_start + '</p>';
			htmlstring += '</a></li>';
			$('#observation_list').append(htmlstring);			
		}
		$("#observation_list").listview("refresh");
	});
}
function testWrite() {
	string = $("#testwrite").val();
	executeQuery('INSERT INTO test VALUES ("' + string + '")');
	insertObservation(0, 1, 'en fugl', 3, 'nidarø', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
	updateObservation(0, 1, 'species', '"en fisk"');

}

function testRead() {
	var read = function(tx) {
		tx.executeSql('SELECT * FROM test', [], readSuccess, dbError);
	}
	var readSuccess = function(tx, results) {
		$("#testread").val(results.rows.item(results.rows.length-1).data);
//		alert(results.rows.length);
	}
	db.transaction(read, dbError, dbSuccess);
}