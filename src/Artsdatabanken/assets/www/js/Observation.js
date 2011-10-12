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
			var idOfSpeciesRow = speciesRow.attr("id").substr(11)
  			if (anchor.is(".add_info")) {;
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
	
	// Fill in values in the extended valus form when that window is opened for a species
	this.fillExtendedValues = function() {
		$("#extended_inf :input[id=spec-name]").val(this.activeExtended.sname);
		$("#extended_inf :input[id=spec-number]").val(this.activeExtended.number);
		$("#extended_inf :input[id=spec-sex]").val(this.activeExtended.sex);
		$("#extended_inf :input[id=spec-age]").val(this.activeExtended.age);
		$("#extended_inf :input[id=spec-activity]").val(this.activeExtended.activity);
		$("#extended_inf :input[id=spec-date_start]").val(this.activeExtended.date_start.getFullYear() + "-" + zero_pad(this.activeExtended.date_start.getMonth()+1,2) + "-" + zero_pad(this.activeExtended.date_start.getDate(),2) );
		$("#extended_inf :input[id=spec-time_start]").val(zero_pad(this.activeExtended.date_start.getHours(),2) + ":" + zero_pad(this.activeExtended.date_start.getMinutes(),2) );
		$("#extended_inf :input[id=spec-date_end]").val(this.activeExtended.date_end.getFullYear() + "-" + zero_pad(this.activeExtended.date_end.getMonth()+1,2) + "-" + zero_pad(this.activeExtended.date_end.getDate(),2) );
		$("#extended_inf :input[id=spec-time_end]").val(zero_pad(this.activeExtended.date_end.getHours(),2) + ":" + zero_pad(this.activeExtended.date_end.getMinutes(),2) );
		$("#extended_inf :input[id=spec-comment]").val(this.activeExtended.comment);

		//	 TODO if picture
		
	}
	// Save information written on the extended page
	this.saveExtended = function() {
		console.log("start saving");
		this.activeExtended.sname = $("#extended_inf :input[id=spec-name]").val();
		this.activeExtended.number = $("#extended_inf :input[id=spec-number]").val();
		this.activeExtended.sex = $("#extended_inf :input[id=spec-sex]").val();
		this.activeExtended.age = $("#extended_inf :input[id=spec-age]").val();
		this.activeExtended.activity = $("#extended_inf :input[id=spec-activity]").val();
		var ds = $("#extended_inf :input[id=spec-date_start]").val();
		var ts = $("#extended_inf :input[id=spec-time_start]").val();
		if (ds != null) {
			if (ts != null) {
				this.activeExtended.date_start = new Date(ds.substr(0,4), ds.substr(5,2)-1, ds.substr(8,2), ts.substr(0,2), ts.substr(3,2));
			}
			else {
				this.activeExtended.date_start = new Date(ds.substr(0,4), ds.substr(5,2)-1, ds.substr(8,2));
			}
		}		
		var de = $("#extended_inf :input[id=spec-date_end]").val();
		var te = $("#extended_inf :input[id=spec-time_end]").val();
		if (de != null) {
			if (te != null) {
				this.activeExtended.date_end = new Date(de.substr(0,4), de.substr(5,2)-1, de.substr(8,2), te.substr(0,2), te.substr(3,2));
			}
			else {
				this.activeExtended.date_end = new Date(de.substr(0,4), de.substr(5,2)-1, de.substr(8,2));
			}
		}
		this.activeExtended.comment = $("#extended_inf :input[id=spec-comment]").val();
		console.log("end saving");
	}
	
	this.updateMainPage = function() {
		$("#species_row" + this.activeExtended.id + " .ui-input-name-spec").val(this.activeExtended.sname);
		$("#species_row" + this.activeExtended.id + " .ui-input-numb-spec").val(this.activeExtended.number);
	}
	
}
