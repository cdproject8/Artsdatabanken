function ObsSpec(id, observation){
	this.observation = observation;
	this.id = id;
	this.species_name = " ";
	this.count = 1;
	this.sex = " ";
	this.age = " ";
	this.activity = " ";
	this.date_start = new Date();
	this.date_end = new Date();
	this.comment = " ";
	this.pictures = new Array();
	
	this.fields = function(){
		var north = this.observation.latitude.toString();
		var east = this.observation.longitude.toString();
		north = north.substr(0, north.indexOf(".")+8);
		east = east.substr(0, east.indexOf(".")+8);
		return [this.species_name, this.count, this.age, this.sex, this.activity, north, east, this.date_start, this.date_end, this.comment];
	 }

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
	
	// TODO are these options limited to birds ?
	this.addActivityBox = function(){
		var sel ='<select class="spec chzn-select" name="spec-activity" id="spec-activity" >'
			+'<option value=""></option><option value="Reir, egg/unger">Reir, egg/unger</option>\n<option value="Reir, unger hørt">Reir, unger hørt</option>\n<option value="Mislykket hekking">Mislykket hekking</option>\n<option value="Rugende">Rugende</option>\n<option value="Eggeskall">Eggeskall</option>\n<option value="Mat til unger">Mat til unger</option>\n<option value="Bar ekskrementpose">Bar ekskrementpose</option>\n<option value="Besøker bebodd reir">Besøker bebodd reir</option>\n<option value="Pulli/nylig utflydd">Pulli/nylig utflydd</option>\n<option value="Brukt reir">Brukt reir</option>\n<option value="Avledningsmanøver">Avledningsmanøver</option>\n<option value="Reirbygging">Reirbygging</option>\n<option value="Rugeflekker">Rugeflekker</option>\n<option value="Varslende, engstelig">Varslende, engstelig</option>\n<option value="Reirbesøk?">Reirbesøk?</option>\n<option value="Parring (eller seremonier)">Parring (eller seremonier)</option>\n<option value="Permanent revir">Permanent revir</option>\n<option value="Par i passende hekkebiotop">Par i passende hekkebiotop</option>\n<option value="Sang/spill">Sang/spill</option>\n<option value="Obs. i hekketid, passende biotop">Obs. i hekketid, passende biotop</option>\n<option value="Rastende">Rastende</option>\n<option value="Stasjonær">Stasjonær</option>\n<option value="Overflygende">Overflygende</option>\n<option value="Næringssøkende">Næringssøkende</option>\n<option value="Sang/spill, ikke hekking">Sang/spill, ikke hekking</option>\n<option value="Lokkelyd, øvrige lyder">Lokkelyd, øvrige lyder</option>\n<option value="Revir, ikke hekking">Revir, ikke hekking</option>\n<option value="Ringmerket">Ringmerket</option>\n<option value="Individmerket">Individmerket</option>\n<option value="Trekkforsøk">Trekkforsøk</option>\n<option value="Trekkende">Trekkende</option>\n<option value="Trekkende mot N">Trekkende mot N</option>\n<option value="Trekkende mor NØ">Trekkende mor NØ</option>\n<option value="Trekkende mot Ø">Trekkende mot Ø</option>\n<option value="Trekkende mot SØ">Trekkende mot SØ</option>\n<option value="Trekkende mot S">Trekkende mot S</option>\n<option value="Trekkende mot SV">Trekkende mot SV</option>\n<option value="Trekkende mot V">Trekkende mot V</option>\n<option value="Trekkende mot NV">Trekkende mot NV</option>\n<option value="Død">Død</option>\n<option value="Ferske spor">Ferske spor</option>\n<option value="Gamle spor">Gamle spor</option>\n<option value="Reir i bruk">Reir i bruk</option>\n'
			+'</select>';
		$("#act-select").append($(sel));
		var chosen_field = $(".chzn-select");
		chosen_field.chosen();
		chosen_field.val(this.activity);
		chosen_field.trigger("liszt:updated");
	}
	
	this.addHTML = function() {
		//Adding the html to the DOM and triggering the jquerymobile to style it
		$('#observation_form').append(this.speciesListHtml().trigger('create'));
   		//Adding autocomplete to the namefield
		$("#species_row"+this.id +" .ui-input-name-spec").speciesAutocomplete({data: observation.autocompleteFile});
	}
	
	this.fillObsListValues = function() {
		$("#species_row" + this.id + " .ui-input-name-spec").val(this.species_name);
		$("#species_row" + this.id + " .ui-input-numb-spec").val(this.count);
	}
	
	
	// Fill in values in the extended valus form when that window is opened for a species
	this.fillExtended = function() {
		// Add autocomplete on name field
		$(".name").speciesAutocomplete({data: observation.autocompleteFile});
		
		$("#extended_inf :input[id=spec-name]").val(this.species_name);
		$("#extended_inf :input[id=spec-count]").val(this.count);
		$("#extended_inf :input[id=spec-sex]").val(this.sex);
		$("#extended_inf :input[id=spec-age]").val(this.age);
		
		//$("#extended_inf :input[id=spec-activity]").val(this.activity);
		// see addActivityBox() in this class for updating this field
		
		$("#extended_inf :input[id=spec-date_start]").val(this.date_start.getFullYear() + "-" + zero_pad(this.date_start.getMonth()+1,2) + "-" + zero_pad(this.date_start.getDate(),2) );
		$("#extended_inf :input[id=spec-time_start]").val(zero_pad(this.date_start.getHours(),2) + ":" + zero_pad(this.date_start.getMinutes(),2) );
		$("#extended_inf :input[id=spec-date_end]").val(this.date_end.getFullYear() + "-" + zero_pad(this.date_end.getMonth()+1,2) + "-" + zero_pad(this.date_end.getDate(),2) );
		$("#extended_inf :input[id=spec-time_end]").val(zero_pad(this.date_end.getHours(),2) + ":" + zero_pad(this.date_end.getMinutes(),2) );
		$("#extended_inf :input[id=spec-comment]").val(this.comment);

		//	 TODO if picture
		for(i = 0; i < this.pictures.length; i++) {
			$("#pics").append('<img src="' + this.pictures[i][0] + '" width="80%" />');	
		}
		
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
	
	this.init = function(s, c, sx, a, ac, ds, de, co, pics) {
		this.species_name = s;
		this.count = c;
		this.sex = sx;
		this.age = a;
		this.activity = ac;
		this.date_start = ds;
		this.date_end = de;
		this.comment = co;
		this.pictures = pics;
	}

}
