function Observation(){

	this.species = new Array();

	this.gpsloc;
	this.location;
	
	this.activeExtended;
	
 	$('#observation_form').click(function(e) {
  		var tar = $(e.target;
  		if (tar.is('a, .add_info')) {
			this.activeExtended = tar.parent().attr("id").substr(11);
			alert(this.activeExtended)
		}
   	});
	
	// TODO make dynamic for each
	var ac = new Autocomplete("../data/autocomplete/89.json");
	
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
