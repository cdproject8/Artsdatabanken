
var db = null

function dbInit() {
	db = window.openDatabase("testDB", "0.1", "adb testdb", 1048576);
	db.transaction(function(tx) {
//		tx.executeSql('DROP TABLE observations');
//		tx.executeSql('DROP TABLE test');
		tx.executeSql('CREATE TABLE IF NOT EXISTS observations (observation_id, observation_row, species, number, location TEXT, sex, age, activity, time_start, time_end, date_start, date_end, comments)');
		tx.executeSql('CREATE TABLE IF NOT EXISTS test (data)');
	}, dbError);
	
	//testdata:
//	insertObservation(0, 1, 'en fugl', 3, 'artsdatabankens hage', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
//	insertObservation(0, 2, 'en fisk', 3, 'artsdatabankens hage', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
//	insertObservation(1, 1, 'pikachu', 3, 'nidar\u00F8', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
//	insertObservation(1, 2, 'charmander', 3, 'nidar\u00F8', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
//	insertObservation(1, 3, 'squirtle', 3, 'nidar\u00F8', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
	
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
		console.log('rows affected: ' + results.rowsAffected)
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
	var q = 'UPDATE observations SET ' + field + '=' + value + ' WHERE observation_id=' + observation_id + ' AND observation_row=' + observation_row
	executeQuery(q, function(tx, results) {
		console.log('rows affected: ' + results.rowsAffected)
	});
}

function populateObservationList() {
	executeQuery('SELECT * FROM observations', function(tx, results) {
		if(results.rows.length == 0) {
			$('#observation_list').append('<p>Nothing here!</p>');
			return;
		}
		for(i = 0; i < results.rows.length; i++){
			item = results.rows.item(i)
			htmlstring =  '<li>';
			htmlstring += '<a href="view-observation.html?id=' + item.observation_id + '&row=' + item.observation_row + '">';
			htmlstring += '<h3>' + item.species + '</h3>';
			htmlstring += '<p>' + item.location + ', ' + item.date_start + ' ' + item.time_start + '</p>';
			htmlstring += '</a></li>';
			$('#observation_list').append(htmlstring);			
		}
		$("#observation_list").listview("refresh");
	});
}

function storeObservation(obs) {
	console.log(obs);
	for(i = 0; i < obs.species.length; i++) {
		insertObservation(0, i, obs.species[i].sname, obs.species[i].number, obs.species[i].location, obs.species[i].sex, obs.species[i].age, obs.species[i].activity, 0, 0, obs.species[i].date_start, obs.species[i].date_end, obs.species[i].comment)		
	}
}
function testWrite() {
	string = $("#testwrite").val();
	executeQuery('INSERT INTO test VALUES ("' + string + '")');
	insertObservation(0, 1, 'en fugl', 3, 'nidar�', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
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

function testClear(){
	executeQuery('DELETE FROM test');
	executeQuery('DELETE FROM observations');
}