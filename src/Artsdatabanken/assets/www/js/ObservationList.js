ObservationList = function() {
	
	var ObsDao = new ObservationDao();
	
	this.populateList(){
		dao.findObservations( function(result) {
			for (var i = 0; i < result.length; i++){
				var date;
				// Note: requires an observation to have at least one entry !!
				dao.findAllEntries({observation_id: result.item(0).id, limit: 1}, function(results){
					date = new Date(results.item(0));
				}, error);
				var htmlstring = '<li>'
							   + '	<a href="observation.html">'
							   + '	<h3>'+result.item(i)+'</h3>'
							   + '	<p>'+date+'</p>'
							   + '	</a></li>';
		   		$('#species_list').append(htmlstring);
			}
		}, error);
		$("#species_list").listview("refresh");
	}
}
