function Observation(){

	this.species = new Array();

	this.gpsloc;
	this.location;
	
	this.activeExtended;

/*
	this.addSpecies = function(newSpecies) {
		this.species.push(newSpecies);
	}
*/

	this.newSpecies = function() {
		newSpec = new ObsSpec(this.len());
		this.species.push(newSpec);
		$('#observation_form').append(newSpec.speciesListHtml().trigger('create'));
		add_autocomplete("#species_row"+newSpec.id +" .ui-input-name-spec");
	}
	
	this.len = function() {
		return this.species.length;
	}
	
}
