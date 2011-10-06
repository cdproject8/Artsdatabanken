
var db = null

function dbInit() {
	db = window.openDatabase("observations", "0.2", "ObservationsDB", 1048576);
	db.transaction(createDB, dbError);
	
	//testdata: //nevermind! old.
//	insertObservation(0, 0, 'en fugl', 3, 'artsdatabankens hage', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
//	insertObservation(0, 1, 'en fisk', 3, 'artsdatabankens hage', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
//	insertObservation(1, 0, 'pikachu', 3, 'nidar\u00F8', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
//	insertObservation(1, 1, 'charmander', 3, 'nidar\u00F8', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
//	insertObservation(1, 2, 'squirtle', 3, 'nidar\u00F8', 'F', 3, 'spiser', 12356543, 23479879, 783947, 73894789, 'hallo');
	
}

function createDB(tx) {
//	tx.executeSql('DROP TABLE IF EXISTS observations');
//	tx.executeSql('DROP TABLE IF EXISTS species');
//	tx.executeSql('DROP TABLE IF EXISTS test');
	tx.executeSql('CREATE TABLE IF NOT EXISTS observations (obsid INTEGER PRIMARY KEY AUTOINCREMENT, location)');	
	tx.executeSql('CREATE TABLE IF NOT EXISTS species (spcid INTEGER PRIMARY KEY AUTOINCREMENT, observation_id, species, number, sex, age, activity, time_start, time_end, date_start, date_end, comments)');	
	tx.executeSql('CREATE TABLE IF NOT EXISTS test (data)');
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
		alert(error.message + ', ' + error);
	}
	
	db.transaction(query, dbError, dbSuccess);
	console.log(q);
}

function insertSpecies(observation_id, species, number, sex, age, activity, time_start, time_end, date_start, date_end, comments) {
	var v = '';
	v += observation_id + ', "';
	v += species + '", "';
	v += number + '", "';
	v += sex + '", "';
	v += age + '", "';
	v += activity + '", "';
	v += time_start + '", "';
	v += time_end + '", "';
	v += date_start + '", "';
	v += date_end + '", "';
	v += comments + '"';
	executeQuery('INSERT INTO species VALUES (NULL,' + v + ')');
}

function insertObservation(location) {
	executeQuery('INSERT INTO observations VALUES (NULL,' + location + ')');
}

function updateObservation(observation_id, observation_row, field, value) {
	var q = 'UPDATE observations SET ' + field + '=' + value + ' WHERE observation_id=' + observation_id + ' AND observation_row=' + observation_row
	executeQuery(q, function(tx, results) {
		console.log('rows affected: ' + results.rowsAffected)
	});
}

function populateObservationList() {
	executeQuery('SELECT * FROM observations', function(tx, oresults) {
		if(oresults.rows.length == 0) {
			$('#observation_list').append('<p>Nothing here!</p>');
			return;
		}
		for(i = 0; i < oresults.rows.length; i++){
			var oid = oresults.rows.item(i).obsid
			executeQuery('SELECT observation_id, species FROM species WHERE observation_id=' + oid, function(tx, sresults) {
				var speciesString = '';
				var obsid = sresults.rows.item(0).observation_id;
				for(j = 0; j < sresults.rows.length; j++) {
					speciesString += sresults.rows.item(j).species;
					if(j < sresults.rows.length-1) {
						speciesString += ', ';
					}
				}
				$('#observation_list').append(htmlstr(obsid, speciesString));
				$("#observation_list").listview("refresh");
			});
		}
		function htmlstr(id, species) {

			htmlstring =  '<li>';
			htmlstring += '<a href="view-observation.html?id=' + 0 + '&row=' + 0 + '">';
			htmlstring += '<h3>Observation ' + id + '</h3>';
			htmlstring += '<p>' + species + '</p>';
			htmlstring += '</a></li>';
			return htmlstring;
		}
	});
}
//function populateObservationList() {
//	executeQuery('SELECT * FROM observations', function(tx, results) {
//		if(results.rows.length == 0) {
//			$('#observation_list').append('<p>Nothing here!</p>');
//			return;
//		}
//		observations = new Array();
//		species = new Array();
//		for(i = 0; i < results.rows.length; i++){
//			item = results.rows.item(i)
//			
//			if(!species[item.observation_id]) {
//				species[item.observation_id] = ''
//			}
//			species[item.observation_id] += item.species + ', '
//			observations[item.observation_id] = item;
//		}
//		function htmlstr(id, species) {
//			
//			htmlstring =  '<li>';
//			htmlstring += '<a href="view-observation.html?id=' + 0 + '&row=' + 0 + '">';
//			htmlstring += '<h3>Observation ' + id + '</h3>';
//			htmlstring += '<p>' + species + '</p>';
//			htmlstring += '</a></li>';
//			return htmlstring;
//		}
//		for(i = 0, len = observations.length; i < len; i++) {
//			$('#observation_list').append(htmlstr(observations[i].observation_id, species[i]));
//			
//		}
//		$("#observation_list").listview("refresh");
//	});
//}

function storeObservation(obs) {
	console.log(obs);
	executeQuery('SELECT * FROM observations', function(tx, results) {
		obsId = results.rows.length+1
		insertObservation('"location here"');
		for(i = 0; i < obs.species.length; i++) {
			insertSpecies(obsId, obs.species[i].sname, obs.species[i].number, obs.species[i].sex, obs.species[i].age, obs.species[i].activity, 0, 0, obs.species[i].date_start, obs.species[i].date_end, obs.species[i].comment)		
		}
	})
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

function testClear(){
	executeQuery('DELETE FROM test');
	executeQuery('DELETE FROM observations');
	executeQuery('DELETE FROM species');
}