function ObservationList() {
	$("#observation_list").listview();
	var error = function() {
		$("#observation_list").append("<li>Could not load observations from database</li>");
	};
	
	this.populateList = function() {
		var specgroups = ["bird", "plant", "fish", "crawler", "mammal"];
		App.dao.findAllObservations( {}, function(result) {
			for (var i = 0; i < result.length; i++){
				var obsId = result.item(i).id;
				var date = new Date(result.item(i).create_date);
				// TODO fix "bird" undearneath
				var htmlstring = '<li>'
							   + '	<a href="observation.html" onClick=" observationId='+obsId+'">'
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
	
	
}
