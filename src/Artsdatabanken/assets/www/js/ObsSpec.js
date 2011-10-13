function ObsSpec(id, observation){
	this.observation = observation;
	this.id = id;
	this.species_name = "s";
	this.count = 1;
	this.sex = " ";
	this.age = " ";
	this.action = " ";
	this.date_start = new Date();
	this.date_end = new Date();
	this.comment = " ";
	this.picture = " ";

	// the html for the observation list
	this.speciesListHtml = function(){
		return $(
		 '<div class="species_row" id="species_row'+this.id+'">'
		+'	<div data-role="fieldcontain" class="ui-grid-a">'
		+'		<div class="ui-block-a">'
		+'			<input type="text" name="name" class="ui-input-name-spec fill" value="" />'
		+'		</div>'
		+'		<div class="ui-block-b">'
		+'			<input type="number" name="count" class="ui-input-numb-spec fill" />'
		+'		</div>'
		+'	</div>'
		+'	<a href="extended-inf.html" data-role="button" data-inline="true"'
		+'		class="ui-btn-right add_info" data-icon="arrow-r">Detaljer</a>'
		+'	<a href="" data-inline="true" data-role="button" class="delete_entry" data-icon="delete">Slett</a>'
		+'	<hr />'
		+'</div>');
	}
	
	this.addHTML = function() {
		//Adding the html to the DOM and triggering the jquerymobile to style it
		$('#observation_form').append(this.speciesListHtml().trigger('create'));
   		//Adding autocomplete to the namefield
		$("#species_row"+this.id +" .ui-input-name-spec").speciesAutocomplete({data: observation.autocompleteFile});
		$(".ui-input-name-spec").bind('autocompleteselect', function(e, ui){
			console.log(e);
			console.log(ui);
		});
	}
	
	this.fillObsListValues = function() {
		$("#species_row" + this.id + " .ui-input-name-spec").val(this.species_name);
		$("#species_row" + this.id + " .ui-input-numb-spec").val(this.count);
	}
	
	
	// Fill in values in the extended valus form when that window is opened for a species
	this.fillExtended = function() {
		$("#extended_inf :input[id=spec-name]").val(this.species_name);
		$("#extended_inf :input[id=spec-count]").val(this.count);
		$("#extended_inf :input[id=spec-sex]").val(this.sex);
		$("#extended_inf :input[id=spec-age]").val(this.age);
		$("#extended_inf :input[id=spec-activity]").val(this.activity);
		$("#extended_inf :input[id=spec-date_start]").val(this.date_start.getFullYear() + "-" + zero_pad(this.date_start.getMonth()+1,2) + "-" + zero_pad(this.date_start.getDate(),2) );
		$("#extended_inf :input[id=spec-time_start]").val(zero_pad(this.date_start.getHours(),2) + ":" + zero_pad(this.date_start.getMinutes(),2) );
		$("#extended_inf :input[id=spec-date_end]").val(this.date_end.getFullYear() + "-" + zero_pad(this.date_end.getMonth()+1,2) + "-" + zero_pad(this.date_end.getDate(),2) );
		$("#extended_inf :input[id=spec-time_end]").val(zero_pad(this.date_end.getHours(),2) + ":" + zero_pad(this.date_end.getMinutes(),2) );
		$("#extended_inf :input[id=spec-comment]").val(this.comment);

		//	 TODO if picture
		
	}
	// Save information written on the extended page
	this.saveExtended = function() {
		this.species_name = $("#extended_inf :input[id=spec-name]").val();
		this.count = $("#extended_inf :input[id=spec-count]").val();
		this.sex = $("#extended_inf :input[id=spec-sex]").val();
		this.age = $("#extended_inf :input[id=spec-age]").val();
		this.activity = $("#extended_inf :input[id=spec-activity]").val();
		var ds = $("#extended_inf :input[id=spec-date_start]").val();
		var ts = $("#extended_inf :input[id=spec-time_start]").val();
		if (ds != null) {
			if (ts != null) {
				this.date_start = new Date(ds.substr(0,4), ds.substr(5,2)-1, ds.substr(8,2), ts.substr(0,2), ts.substr(3,2));
			}
			else {
				this.date_start = new Date(ds.substr(0,4), ds.substr(5,2)-1, ds.substr(8,2));
			}
		}		
		var de = $("#extended_inf :input[id=spec-date_end]").val();
		var te = $("#extended_inf :input[id=spec-time_end]").val();
		if (de != null) {
			if (te != null) {
				this.date_end = new Date(de.substr(0,4), de.substr(5,2)-1, de.substr(8,2), te.substr(0,2), te.substr(3,2));
			}
			else {
				this.date_end = new Date(de.substr(0,4), de.substr(5,2)-1, de.substr(8,2));
			}
		}
		this.comment = $("#extended_inf :input[id=spec-comment]").val();
	}

}
