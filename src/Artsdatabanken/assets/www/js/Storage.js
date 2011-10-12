
var db = null

function dbInit() {
	db = window.openDatabase("observations", "0.2", "ObservationsDB", 1048576);
	db.transaction(function(tx) {
		tx.executeSql('CREATE TABLE IF NOT EXISTS observations (obsid INTEGER PRIMARY KEY AUTOINCREMENT, location)');	
		tx.executeSql('CREATE TABLE IF NOT EXISTS species (spcid INTEGER PRIMARY KEY AUTOINCREMENT, observation_id, species, number, sex, age, activity, time_start INTEGER, time_end INTEGER, comments)');	
		tx.executeSql('CREATE TABLE IF NOT EXISTS test (data)');
		
	}, dbError);
}

function dbError(error) {
	alert('Error: ' + error.message);
}

function dbSuccess(tx, results) {

//	alert('success?');
}

function executeQuery(q, success) {
	function query(tx) {
		tx.executeSql(q, [], success,dbError);
	}

	function qError(error) {
		console.log(error)
		alert(error.message + ', ' + error.code);
	}
	
	db.transaction(query, dbError, dbSuccess);
	console.log(q);
}

function insertSpecies(observation_id, species, number, sex, age, activity, time_start, time_end, comments) {
	var v = '';
	v += observation_id + ', "';
	v += species + '", "';
	v += number + '", "';
	v += sex + '", "';
	v += age + '", "';
	v += activity + '", ';
	v += time_start + ', ';
	v += time_end + ', "';
	v += comments + '"';
	function query(tx) {
		tx.executeSql('INSERT INTO species (spcid, observation_id, species, number, sex, age, activity, time_start, time_end, comments) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [observation_id, species, number, sex, age, activity, time_start, time_end, comments], dbSuccess, dbError);
	}
	db.transaction(query, dbError)
//	executeQuery('INSERT INTO species VALUES (NULL,' + v + ')');
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
			htmlstring += '<a href="view-observation.html?id=' + id + '">';
			htmlstring += '<h3>Observation ' + id + '</h3>';
			htmlstring += '<p>' + species + '</p>';
			htmlstring += '</a></li>';
			return htmlstring;
		}
	});
}
function populateSpeciesList() {
	var obsId = $.getUrlVar('id');
	$('#species_list_header').append('Observation ' + obsId);
	executeQuery('SELECT species, number, observation_id, spcid FROM species WHERE observation_id=' + obsId, function(tx, results) {
		for(i = 0; i < results.rows.length; i++) {
			var item = results.rows.item(i);
			htmlstring =  '<li>';
			htmlstring += '<a href="view-species.html?id=' + item.observation_id + '&row=' + item.spcid + '">';
			htmlstring += '<h3>' + item.species + '</h3>';
			htmlstring += '<p>' + item.number + '</p>';
			htmlstring += '</a></li>';
			$('#species_list').append(htmlstring);
		}
		$("#species_list").listview("refresh");
	});
}

function viewSpecies() {
	var obsId = $.getUrlVar('id');
	var spcId = $.getUrlVar('row');
	executeQuery('SELECT * FROM species WHERE spcid=' + spcId, function(tx, results) {
		var item = results.rows.item(0);
		console.log(item);
		$("#spv-name").val(item.species);
		$("#spv-number").val(item.number);
		$("#spv-sex").val(item.sex);
		$("#spv-age").val(item.age);
		$("#spv-activity").val(item.activity);
		var ds = new Date(item.time_start)
		$("#spv-date_start").val(ds.getFullYear() + "-" + zero_pad(ds.getMonth()+1,2) + "-" + zero_pad(ds.getDate(),2));
		$("#spv-time_start").val(zero_pad(ds.getHours(),2) + ":" + zero_pad(ds.getMinutes(),2) );
		var de = new Date(item.time_end)
		$("#spv-date_end").val(de.getFullYear() + "-" + zero_pad(de.getMonth()+1,2) + "-" + zero_pad(de.getDate(),2));
		$("#spv-time_end").val(zero_pad(de.getHours(),2) + ":" + zero_pad(de.getMinutes(),2) );
		$("#spv-comment").val(item.comments);

		$('#view_species_header').append(item.species)
	});
}

function updateSpecies() {
	q = 'UPDATE species SET'
	+ ' species="' + $("#spv-name").val() + '",'
	+ ' number="' + $("#spv-number").val() + '",'
	+ ' sex="' + $("#spv-sex").val() + '",'
	+ ' age="' + $("#spv-age").val() + '",'
	+ ' activity="' + $("#spv-activity").val() + '",'
	+ ' time_start="' + timestamp($("#spv-date_start").val(),$("#spv-time_start").val()) + '",'
	+ ' time_end="' + timestamp($("#spv-date_end").val(),$("#spv-time_end").val()) + '",'
	+ ' comments="' + $("#spv-comment").val() + '"'
	+ ' WHERE spcid=' + $.getUrlVar('row');
	executeQuery(q, function(tx, results) {
		alert('Saved!')
	});
}

function timestamp(date, time) {
	d = new Date(date.substr(0,4), date.substr(5,2)-1, date.substr(8,2), time.substr(0,2), time.substr(3,2));
	return d.getTime();
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
			insertSpecies(obsId, obs.species[i].sname, obs.species[i].number, obs.species[i].sex, obs.species[i].age, obs.species[i].activity, obs.species[i].date_start.getTime(), obs.species[i].date_end.getTime(), obs.species[i].comment)		
		}
	})
}
function testWrite() {
	string = $("#testwrite").val();
//	executeQuery('INSERT INTO test VALUES ("' + string + '")');
	db.transaction(function(tx) {
		tx.executeSql('INSERT INTO test VALUES (?)', [string], dbSuccess, dbError);
	}, dbError)
//	insertSpecies(1, "hallo", 3, "male", 3, "nourish", 123123, 123123, "hallo");

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

function testDrop() {
	executeQuery('DROP TABLE IF EXISTS observations');
	executeQuery('DROP TABLE IF EXISTS species');
	executeQuery('DROP TABLE IF EXISTS test');
}