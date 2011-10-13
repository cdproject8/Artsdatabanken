function ObservationList(dao) {
	console.log("init obs");
	
	var error;
	
	this.populateList = function(){
		dao.findAllObservations( {}, function(result) {
			for (var i = 0; i < result.length; i++){
				var obsId = result.item(i).id;
				var date = result.item(i).create_date;
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
