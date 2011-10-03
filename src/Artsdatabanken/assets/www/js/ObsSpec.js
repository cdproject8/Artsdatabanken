function ObsSpec(id){
	this.id = zero_pad(id,3);
	this.sname = "";
	this.number = 1;
	this.sex;
	this.age;
	this.action;
	this.time_start;
	this.date_start;
	this.time_end;
	this.date_end;
	this.comment;
	this.picture;

	this.speciesListHtml = function(){
		return $(
		 '<div class="species_row" id="species_row'+this.id+'">'
		+'	<div data-role="fieldcontain" class="ui-grid-a">'
		+'		<div class="ui-block-a">'
		+'			<input type="text" name="name" id="spec-name" class="ui-input-name-spec fill" value="" />'
		+'		</div>'
		+'		<div class="ui-block-b">'
		+'			<input type="number" name="number" id="spec-number" class="ui-input-numb-spec fill" />'
		+'		</div>'
		+'	</div>'
		+'	<a href="extended-inf.html" data-role="button" data-inline="true"'
		+'		class="ui-btn-right add_info" data-icon="arrow-r">Add More Information</a>'
		+'	<hr />'
		+'</div>');
	}
	
	this.extended = function() {
	}
}
