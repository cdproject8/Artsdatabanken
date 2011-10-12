function Observation(specGroupId){

	//pointer for jquery functions
	var obs = this;
	this.id = -1;	
	this.species = new Array();

	this.gpsloc;
	this.location;
	this.saved = false;
	
	this.activeExtended;

	// TODO make autocomplete loading dynamic for each species group
	this.autocompleteFile = "data/autocomplete/89/index.js";
	
	// Set activeExtended to the species_row selected when clicking "Add More Information" button
	// TODO save this information on other events than just editing it's extended information
 	$('#observation_form').click(function(e) {
  		var tar = $(e.target);
  		//console.log(tar);
		var anchor;
		var trigg = false;
		// Trigger if clicked on the text or icon in a button
  		if (tar.is('.ui-btn-text') || tar.is('.ui-icon')) {
  			trigg = true;
  			anchor = tar.parent().parent();
		}
		// Trigger if clicked somewhere else on the button
		else if(tar.is('.ui-btn-inner')) {
			trigg = true;
			anchor = tar.parent();
		}
  		if (trigg) {
			var speciesRow = anchor.parent();
			var idOfSpeciesRow = speciesRow.attr("id").substr(11);
  			if (anchor.is(".add_info")) {
				obs.activeExtended = obs.getSpecies(idOfSpeciesRow);
		
				// Saving values for the row in the objects.
				// .change() event did not always trigger for autocomplete etc.
				var nameInput = $(".ui-input-name-spec", speciesRow);
				if (nameInput == null) nameInput = " ";
				var numInput = $(".ui-input-numb-spec", speciesRow);
				if (numInput == null) numInput = "1";
				// console.log(nameInput.val() + numInput.val());
				obs.getSpecies(idOfSpeciesRow).sname = nameInput.val();
				obs.getSpecies(idOfSpeciesRow).number = numInput.val();
			}
			if (anchor.is(".delete_entry")) {
				if ( confirm("Are you sure you want to delete "+obs.getSpecies(idOfSpeciesRow).sname + "from the observation")) {
					obs.removeSpecies(idOfSpeciesRow);
				}
			}
		}
   	});
	
	this.removeSpecies = function(specnum) {
		$("#species_row"+specnum).remove();
		var spec = this.getSpecies(specnum);
		this.species.splice(this.species.indexOf(spec),1);
		delete spec;
	}
	
	// For use together with loading from database and unit testing
	this.addSpecies = function(newSpec) {	
		this.species.push(newSpec);
	}
	
	this.newSpecies = function() {
		var prevSpec = this.species[this.len()-1];
		var newSpec = new ObsSpec(this.newId(), this);
		this.species.push(newSpec);
		if (this.len() > 1) {
			newSpec.date_start.setTime(prevSpec.date_start.getTime());
			newSpec.date_end.setTime(prevSpec.date_end.getTime());
		}
		newSpec.addHTML();
	}
	
	// Added this instead of just length for use later when you're able to 
	// delete a species from an observation
	this.newId = function() {
		if (this.species.length==0) return 0;
		return this.species[this.species.length-1].id+1;
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
	
	// Redirect function calls
	this.fillExtended = function() { this.activeExtended.fillExtended(); }
	this.saveExtended = function() { this.activeExtended.saveExtended(); }
	
	this.updateMainPage = function() {
		this.activeExtended.fillObsListValues();
	}
	
	this.saveAll = function() {
		$('#observation_form .species_row').each(function(i, row){
			var sRow = $(row);
			var idOfSpeciesRow = sRow.attr("id").substr(11);			
			obs.getSpecies(idOfSpeciesRow).sname = $(".ui-input-name-spec", sRow).val();
			obs.getSpecies(idOfSpeciesRow).number = $(".ui-input-numb-spec", sRow).val();
		});
	}
	
}
