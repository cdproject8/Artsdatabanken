function ObservationList() {
	$("#observation_list").listview();
	var error = function() {
		$("#observation_list").append("<li>Could not load observations from database</li>");
	};
	
	this.populateList = function() {
		var specgroups = ["bird", "plant", "fish", "crawler", "mammal"];
		App.dao.findAllObservations( {}, function(result) {
			if (result.length == 0) $("#observation_list").append("<li>No saved observations</li>");
			for (var i = 0; i < result.length; i++){
				var obsId = result.item(i).id;
				var date = new Date(result.item(i).create_date);
				var htmlstring = '<li>'
							   + '	<a href="observation.html" onClick=" observationId='+obsId+'; return true;">'
							   + '	<img src="images/'+specgroups[parseInt(result.item(i).specGroupId) -1]+'.jpg".html/>'
							   + '		<h3>Observation '+obsId+'</h3>'
							   + '		<p>'+date+" "+(( result.item(i).exported == "true" )?"Eksportert":"")+'</p>'
							   + '	</a>'
							   + '</li>';
		   		$('#observation_list').append(htmlstring);
			}
			$("#observation_list").listview("refresh");
		}, error);
	};
	
	this.populateList();
	
}
