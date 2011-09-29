function Observation(){

	this.species = new Array();

	this.gpsloc;
	this.location;
	
	this.activeExtended;
	
	
	// Set activeExtended to the species_row selected to fill in correct values in the
	// extended information window
 	$('#observation_form').click(function(e) {
  		var tar = $(e.target);
  		if (tar.is('.ui-btn-text')) {
  			var anchor = tar.parent().parent();
  			if (anchor.is(".add_info")) {
				this.activeExtended = anchor.parent().attr("id").substr(11);
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
