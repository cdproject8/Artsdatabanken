function Observation(specGroupId, obsId){

	//pointer for jquery functions
	var obs = this;
	this.id = null;
	this.species = new Array();

	this.gpsloc;
	this.location;
	this.saved = false;
	this.create_date = new Date();
	
	this.activeExtended;
		
	// TODO make autocomplete loading dynamic for each species group based on specGroupId
	this.autocompleteFile = "data/autocomplete/89/index.js";
	
	// Set activeExtended to the species_row selected when clicking "Add More Information" button
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
				obs.getSpecies(idOfSpeciesRow).species_name = nameInput.val();
				obs.getSpecies(idOfSpeciesRow).count = numInput.val();
			}
			if (anchor.is(".delete_entry")) {
				if ( confirm("Are you sure you want to delete "+obs.getSpecies(idOfSpeciesRow).species_name + "from the observation")) {
					obs.removeSpecies(idOfSpeciesRow);
				}
			}
		}
   	});
	
	this.removeSpecies = function(specnum) {
		$("#species_row"+specnum).remove();
		var spec = this.getSpecies(specnum);
		App.dao.removeEntry(parseInt(specnum), obs.id, function() {
			console.log("deleting " + specnum + " from " + obs.id);
		}, null);
		this.species.splice(this.species.indexOf(spec),1);
		delete spec;
	}
	
	this.deleteObs = function(){
		if ( confirm("Are you sure you want to delete this observation?")){
			var obsid = this.id;
			App.dao.removeObservation(this.id, function(result) {
				console.log("deleted observation "+obsid);
			},null);
		}
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
	
	// Run this before saving the observation
	this.saveAll = function() {
		$('#observation_form .species_row').each(function(i, row){
			var sRow = $(row);
			var idOfSpeciesRow = sRow.attr("id").substr(11);			
			obs.getSpecies(idOfSpeciesRow).species_name = $(".ui-input-name-spec", sRow).val();
			obs.getSpecies(idOfSpeciesRow).count = $(".ui-input-numb-spec", sRow).val();
		});
	}
	
	this.saveToDao = function() {
		this.saveAll();
		$.each(this.species, function(i, val){
			App.dao.saveEntry(val, function(){
//				console.log("saving "+i);
			}, null);
		});
	}
	
	this.loadFromDao = function() {
		this.id = obsId;
		App.dao.findAllEntries({observation_id: this.id }, function(result){
			for (var i=0; i < result.length;i++){
				var newSpec = new ObsSpec(result.item(i).id, obs);
				newSpec.init(result.item(i).species_name, result.item(i).count, result.item(i).sex, result.item(i).age, result.item(i).action, new Date(result.item(i).date_start), new Date(result.item(i).date_end), result.item(i).comment);
				newSpec.addHTML();
				newSpec.fillObsListValues();
				obs.addSpecies(newSpec);
			}
		
		}, null);
	}
	
	// if id specified then read observation from Dao
	if (obsId != null) {
		console.log("loading "+obsId +" from db");
		this.loadFromDao();
	} // Else then request a new id from the Dao
	else {
		App.dao.saveObservation(this, function(newId){
			obs.id = newId;
			console.log("created new obs "+newId);
		}, null);
	}
	
}
