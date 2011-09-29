function Observation(){

	this.species = new Array();

	this.gpsloc;
	this.location;
	
	this.activeExtended;
	
 	$('#observation_form').click(function(e) {
 		console.log("clicked inside form");
  		var tar = $(e.target);
 		
  		if (tar.is('.ui-btn-text')) {
  			console.log("clicked button");
  			console.log(tar);
  			if (tar.is(".add_info")) {
  				console.log("correct link");
				this.activeExtended = tar.parent().attr("id").substr(11);
				console.log(this.activeExtended);
				}
		}
   	});
	
	// TODO make dynamic for each
	var ac = new Autocomplete("data/autocomplete/91.jsonp");
	this.newSpecies = function() {
		newSpec = new ObsSpec(this.len());
		this.species.push(newSpec);
		$('#observation_form').append(newSpec.speciesListHtml().trigger('create'));
		ac.activate("#species_row"+newSpec.id +" .ui-input-name-spec");
	}
	
	this.len = function() {
		return this.species.length;
	}
	
}
