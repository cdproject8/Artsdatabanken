function ObservationList(dao) {
	console.log("init obs");
	
	var error;
	
	this.populateList = function(){
		dao.findAllObservations( function(result) {
			for (var i = 0; i < result.length; i++){
				var obsId = result.item(0).observation_id;
				var date;
				// Note: requires an observation to have at least one entry !!
				dao.findAllEntries({observation_id: result.item(0).id, limit: 1}, function(results){
					date = new Date(results.item(0));
				}, error);
				var htmlstring = '<li>'
							   + '	<a href="observation.html" onClick= observationId='+obsId+'>'
							   + '		<h3>'+result.item(i)+'</h3>'
							   + '		<p>'+date+'</p>'
							   + '	</a>'
							   + '</li>';
		   		$('#species_list').append(htmlstring);
			}
		}, error);
		$("#species_list").listview("refresh");
	}
	
}
