function ObsSpec(id, observation){
	this.id = zero_pad(id,3);
	this.sname = "s";
	this.number = 1;
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
		+'			<input type="number" name="number" class="ui-input-numb-spec fill" />'
		+'		</div>'
		+'	</div>'
		+'	<a href="extended-inf.html" data-role="button" data-inline="true"'
		+'		class="ui-btn-right add_info" data-icon="arrow-r">Add More Information</a>'
		+'	<a href="" data-inline="true" data-role="button" class="delete_entry" data-icon="delete">Delete</a>'
		+'	<hr />'
		+'</div>');
	}
	
	this.addHTML = function() {
		//Adding the html to the DOM and triggering the jquerymobile to style it
		$('#observation_form').append(this.speciesListHtml().trigger('create'));
   		//Adding autocomplete to the namefield
		$("#species_row"+this.id +" .ui-input-name-spec").speciesAutocomplete({data: observation.autocompleteFile})
	}
}
