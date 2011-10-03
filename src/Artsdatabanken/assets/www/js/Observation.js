function Observation(){

	var obs = this;
	
	this.species = new Array();

	this.gpsloc;
	this.location;
	
	this.activeExtended;

	// TODO make autocomplete loading dynamic for each species group
	this.ac = new Autocomplete("data/autocomplete/91.jsonp");	
	
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
  		if (trigg && anchor.is(".add_info")) {
			var speciesRow = anchor.parent();
			var idOfSpeciesRow = speciesRow.attr("id").substr(11);
			obs.activeExtended = obs.getSpecies(idOfSpeciesRow);
			//console.log("saved " + obs.activeExtended + " to active extended");
		
			// Saving values for the row in the objects.
			// .change() event did not always trigger for autocomplete etc.
			var nameInput = $(":input[id=spec-name]", speciesRow);
			if (nameInput == null) nameInput = " ";
			var numInput = $(":input[id=spec-number]", speciesRow);
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
				this.activeExtended.date_start = new Date(ds.substr(0,2), ds.substr(5,2), ds.substr(8,2), ts.substr(0,2), ts.substr(3,2));
			}
			else {
				this.activeExtended.date_start = new Date(ds.substr(0,4),ds.substr(5,2),ds.substr(8,2));
			}
		}		
		var de = $("#extended_inf :input[id=spec-date_end]").val();
		var te = $("#extended_inf :input[id=spec-time_end]").val();
		if (de != null) {
			if (te != null) {
				this.activeExtended.date_end = new Date(de.substr(0,4), de.substr(5,2), de.substr(8,2), te.substr(0,2), te.substr(3,2));
			}
			else {
				this.activeExtended.date_end = new Date(de.substr(0,4), de.substr(5,2), de.substr(8,2));
			}
		}
		this.activeExtended.comment = $("#extended_inf :input[id=spec-comment]").val();
		console.log("end saving");
	}
	
	//TODO these DOM elements aren't found to be updated >_>
	this.updateMainPage = function() {
		console.log($("#observation_form"));
		console.log($(".species_row" + this.activeExtended.id + " :input[id=spec-name]"));
		$(".species_row" + this.activeExtended.id + " :input[id=spec-name]").val(this.activeExtended.sname);
		$(".species_row" + this.activeExtended.id + " :input[id=spec-number]").val(this.activeExtended.number);
	}
	
}
