function Observation(){

	var obs = this;
	
	this.species = new Array();

	this.gpsloc;
	this.location;
	
	this.activeExtended;

	// TODO make autocomplete loading dynamic for each species group
	this.ac = new Autocomplete("data/autocomplete/91.jsonp");	
	
	// Set activeExtended to the species_row selected when clicking "Add More Information" button
	// TODO for some reason this event is not always triggered
 	$('#observation_form').click(function(e) {
  		var tar = $(e.target);
  		if (tar.is('.ui-btn-text')) {
  			var anchor = tar.parent().parent();
  			if (anchor.is(".add_info")) {
  				var speciesRow = anchor.parent();
  				var idOfSpeciesRow = speciesRow.attr("id").substr(11);
				obs.activeExtended = idOfSpeciesRow;
				console.log("saved " + obs.activeExtended + " to active extended");
				
				// Saving values for the row in the objects.
				// .change() event did not always trigger for autocomplete etc.
				var nameInput = $("input[id=spec-name]", speciesRow);
				var numInput = $("input[id=spec-number]", speciesRow);
				// console.log(nameInput.val() + numInput.val());
				obs.getSpecies(idOfSpeciesRow).sname = nameInput.val();
				obs.getSpecies(idOfSpeciesRow).number = numInput.val();
				}
		}
   	});
	
	this.addSpecies = function(newSpec) {	
		this.species.push(newSpec);
	}
	
	this.newSpecies = function() {
		newSpec = new ObsSpec(this.len());
		this.species.push(newSpec);
		//Adding the html to the DOM and triggering the jquerymobile to style it
		$('#observation_form').append(newSpec.speciesListHtml().trigger('create'));
   		//Adding autocomplete to the namefield
		this.ac.activate("#species_row"+newSpec.id +" .ui-input-name-spec");
	}
	
	this.len = function() {
		return this.species.length;
	}
	
	this.getSpecies = function(id){
		for (i in this.species) {
			if (this.species[i].id == id) return this.species[i];
		}
		return null;
	}
	
	// Fill in values in the extended valus form when that window is opened for a species
	this.fillExtendedValues = function() {
		var currentSpecies = this.getSpecies(this.activeExtended);
		$("#extended_inf input[id=spec-name]").val(currentSpecies.sname);
		$("#extended_inf input[id=spec-number]").val(currentSpecies.number);
		for (i in currentSpecies) {
			//console.log(i);
			
			/*
			 TODO complete this, move number inside for loop, 
			 currentSpecies.<field> corresponds to input[id=spec-<field>] except for sname,
			 because name is a reserved javascript keyword, can change one of these to generalize it
			*/
		}
	}
	
}
