function Observation(){

	this.species = new Array();

	this.gpsloc;
	this.location;
	
	this.activeExtended;

	// TODO make autocomplete loading dynamic for each species group
	this.ac = new Autocomplete("data/autocomplete/91.jsonp");	
	
	// Set activeExtended to the species_row selected to fill in correct values in the
	// extended information window
 	$('#observation_form').click(function(e) {
  		var tar = $(e.target);
  		if (tar.is('.ui-btn-text')) {
  			var anchor = tar.parent().parent();
  			if (anchor.is(".add_info")) {
				this.activeExtended = anchor.parent().attr("id").substr(11);
				console.log("saved "+this.activeExtended+" to active extended");
				}
		}
   	});
	
	this.addSpecies = function(newSpec) {	
		this.species.push(newSpec);
	}
	
	this.newSpecies = function() {
		newSpec = new ObsSpec(this.len());
		this.species.push(newSpec);
		$('#observation_form').append(newSpec.speciesListHtml().trigger('create'));
		this.ac.activate("#species_row"+newSpec.id +" .ui-input-name-spec");
	}
	
	this.len = function() {
		return this.species.length;
	}
	
	this.getSpecies = function(id){
		console.log("fetching species "+id);
		for (i in this.species) {
			if (this.species[i].id == id) return this.species[i];
		}
		console.log(id+" not found");
		return null;
	}
	
	this.fillExtendedValues = function() {
		console.log("trying to get active: " +this.activeExtended);
		var currentSpecies = this.getSpecies(this.activeExtended);
		console.log("filling in values for "+currentSpecies.id);
		for (i in currentSpecies) {
			console.log(i);
		}
	}
	
}
