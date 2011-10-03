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
  		if (trigg && anchor.is(".add_info")) {
			var speciesRow = anchor.parent();
			var idOfSpeciesRow = speciesRow.attr("id").substr(11);
			obs.activeExtended = idOfSpeciesRow;
			console.log("saved " + obs.activeExtended + " to active extended");
		
			// Saving values for the row in the objects.
			// .change() event did not always trigger for autocomplete etc.
			var nameInput = $("input[id=spec-name]", speciesRow);
			if (nameInput == null) nameInput = " ";
			var numInput = $("input[id=spec-number]", speciesRow);
			if (nameInput == null) nameInput = "1";
			// console.log(nameInput.val() + numInput.val());
			obs.getSpecies(idOfSpeciesRow).sname = nameInput.val();
			obs.getSpecies(idOfSpeciesRow).number = numInput.val();
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
		$("#extended_inf input[id=spec-sex]").val(currentSpecies.sex);
		$("#extended_inf input[id=spec-age]").val(currentSpecies.age);
		$("#extended_inf input[id=spec-activity]").val(currentSpecies.activity);
		$("#extended_inf input[id=spec-date_start]").val(currentSpecies.date_start.getFullYear() + "-" + zero_pad(currentSpecies.date_start.getMonth()+1,2) + "-" + zero_pad(currentSpecies.date_start.getDate(),2) );
		$("#extended_inf input[id=spec-time_start]").val(zero_pad(currentSpecies.date_start.getHours(),2) + ":" + zero_pad(currentSpecies.date_start.getMinutes(),2) );
		$("#extended_inf input[id=spec-date_end]").val(currentSpecies.date_end.getFullYear() + "-" + zero_pad(currentSpecies.date_end.getMonth()+1,2) + "-" + zero_pad(currentSpecies.date_end.getDate(),2) );
		$("#extended_inf input[id=spec-time_end]").val(zero_pad(currentSpecies.date_end.getHours(),2) + ":" + zero_pad(currentSpecies.date_end.getMinutes(),2) );
		$("#extended_inf input[id=spec-comment]").val(currentSpecies.comment);

		//	 TODO if picture
		
	}
	this.saveExtended = function() {
		console.log("saving "+ this.activeExtended);
		var currentSpecies = this.getSpecies(this.activeExtended);
//		console.log($('#extended_inf input'))
		currentSpecies.sname = $("#extended_inf input[id=spec-name]").val();
		currentSpecies.number = $("#extended_inf input[id=spec-number]").val();
		currentSpecies.sex = $("#extended_inf input[id=spec-sex]").val();
		currentSpecies.age = $("#extended_inf input[id=spec-age]").val();
		currentSpecies.activity = $("#extended_inf input[id=spec-activity]").val();

		var ds = $("#extended_inf input[id=spec-date_start]").val();
		var ts = $("#extended_inf input[id=spec-time_start]").val();
		var dateS = "";
		
		console.log(ds);
		console.log(ts);

		if (ds != null) {
			dateS = ds;
			if (ts != null) {
				dateS += " " + ts;
				currentSpecies.date_start = new Date(dateS.substr(0,4), dateS.substr(5,7), dateS.substr(8,10), dateS.substr(11,13), dateS.substr(14,16));
			}
			else {
				currentSpecies.date_start = new Date(dateS.substr(0,4),dateS.substr(5,7),dateS.substr(8,10));
			}
		}
		
		var de = $("#extended_inf input[id=spec-date_end]").val();
		var te = $("#extended_inf input[id=spec-time_end]").val();
		dateS = "";
		if (de != null) {
			dateS = de;
			if (te != null) {
				dateS += " " + te;
				currentSpecies.date_end = new Date(dateS.substr(0,4), dateS.substr(5,7), dateS.substr(8,10), dateS.substr(11,13), dateS.substr(14,16));
			}
			else {
				currentSpecies.date_end = new Date(dateS.substr(0,4),dateS.substr(5,7),dateS.substr(8,10));
			}
		}
		
		currentSpecies.comment = $("#extended_inf input[id=spec-comment]").val();
		
	}
	
}
