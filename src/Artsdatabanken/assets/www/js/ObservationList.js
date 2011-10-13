function ObservationList() {
	$("#observation_list").listview();
	var error;
	
	this.populateList = function(){
		dao.findAllObservations( {}, function(result) {
			for (var i = 0; i < result.length; i++){
				var obsId = result.item(i).id;
				var date = new Date(result.item(i).create_date);
				var htmlstring = '<li>'
							   + '	<a href="observation.html" onClick=" observationId='+obsId+'">'
							   + '		<h3>Observation '+obsId+'</h3>'
							   + '		<p>'+date+'</p>'
							   + '	</a>'
							   + '</li>';
		   		$('#observation_list').append(htmlstring);
			}
			$("#observation_list").listview("refresh");
		}, error);
	}
	
	
}
