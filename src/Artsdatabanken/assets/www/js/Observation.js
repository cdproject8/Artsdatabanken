function Observation(specGroupId, obsId){

	//pointer for jquery functions
	var obs = this;
	
	// Values saved to the Dao
	this.specGroupId = specGroupId;
	this.id = null;
	this.longitude = " ";
	this.latitude = " ";
	this.exported = false;
	this pictures = new Array();

	this.create_date = new Date();
	
	// Other helper values
	this.species = new Array();
	this.saved = false;
	this.deleted = false;
	this.activeExtended;
		
	// TODO make autocomplete loading dynamic for each species group based on specGroupId
	this.autocompleteFile = "data/autocomplete/"+specGroupId+".js";
	
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
			//console.log("deleting " + specnum + " from " + obs.id);
		}, null);
		this.species.splice(this.species.indexOf(spec),1);
		delete spec;
	}
	
	this.deleteObs = function(silent){
		if ( this.deleted == false && (silent || confirm("Are you sure you want to delete this observation?"))){
			//console.log(this.deleted == false);
			var obsid = this.id;
			this.deleted = true;
			App.dao.removeObservation(this.id, function(result) {
				//console.log("deleted observation "+obsid);
			},null);
			if (!silent) $.mobile.changePage( "index.html");
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
		if (this.activeExtended != null) this.activeExtended.fillObsListValues();
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
			// console.log("saving "+i);
			}, null);
		});
		App.dao.updateObservation(this, function(id){
			//console.log("saved obs "+id);
			alert("Data Saved");
		}, null);
	}
	
	this.loadFromDao = function(obsId) {
		this.id = obsId;
		App.dao.findObservation(this.id, function(result) {
			obs.longitude = result.longitude;
			obs.latitude = result.latitude;
			obs.exported = (result.exported == "true");
			obs.specGroupId = result.specGroupId;
			
			$("#export-button .ui-btn-text").text(((obs.exported)?"Eksporter (igjen)":"Eksporter"));
			$("#obs-long").val(obs.longitude);
			$("#obs-lat").val(obs.latitude);
		}, null);
		
		App.dao.findAllEntries({observation_id: this.id }, function(result){
			for (var i=0; i < result.length;i++){
				var newSpec = new ObsSpec(result.item(i).id, obs);
				newSpec.init(result.item(i).species_name, result.item(i).count, result.item(i).sex, result.item(i).age, result.item(i).activity, new Date(result.item(i).date_start), new Date(result.item(i).date_end), result.item(i).comment);
				newSpec.addHTML();
				newSpec.fillObsListValues();
				obs.addSpecies(newSpec);
			}
		
		}, null);
	}
	
	this.exportDataString = function(){
		
		// Fields to tell the import tool which fields are included
		var string = "Art\tAntall\tAlder\tKjønn\tAktivitet\tNord koordinat\tØst koordinat\tStartdato\tStarttid\tSluttdato\tSluttid\tKommentar\n";
		
		$.each(this.species, function(i, val){
			var fields = val.fields();
			//console.log(val.fields());
			$.each(fields, function(j, fval){
				//console.log(j + " " + fval);
				string += fval.toString() +"\t"
			});
			string += "\n";
		});
		//console.log(string);
		return string;
	}
	
	this.exportObservation = function() {
		this.saveAll();
		var datastring = this.exportDataString();
		Android.sendEmail("Observation "+this.id, datastring);
		this.exported = true;
		App.dao.updateObservation(this, null, null);
		$("#export-button .ui-btn-text").text("Eksporter (igjen)");
	}
	
	this.getGPSLocation = function() {
		getPosition();
	}
	
	this.addPicture = function() {
		pic = takePictureAsURI();
		console.log(pic)
		if(pic || pic != "" ) {
			pictures.append(pic);
			$("#pictures").append('<pic src="' + pic + '"/>');
		}
		
	}
	
	// if id specified then read observation from Dao
	if (obsId != null) {
		//console.log("loading "+obsId +" from db");
		this.loadFromDao(obsId);
	} // Else then request a new id from the Dao
	else {
		App.dao.saveObservation(this, function(newId){
			obs.id = newId;
			//console.log("created new obs "+newId);
		}, null);
		this.newSpecies();
	}
	
}
