function ObsSpec(id){
	this.id = zero_pad(id,3);
	this.sname;
	this.num;
	this.sex;
	this.age;
	this.action;
	this.timeStart
	this.dateStart;
	this.timeEnd;
	this.dateEnd;
	this.comment;
	this.picture;

	this.speciesListHtml = function(){
		return $(	
			// TODO Could we use ..class="species_row" id="species_row+this.id".. instead of 
			// specifying the IDs in multiple input elements? Using this method we can access
			// input elements like this: $('.species', '#species_row34'), assuming
			// id=..spe+this.id.. is replaced by class="species".
		 '<div class="species_row">'
		+'	<div data-role="fieldcontain" class="ui-grid-a">'
		+'		<div class="ui-block-a">'
		+'			<input type="text" name="name" id="spe'+this.id+'" class="ui-input-name-spec fill" value="" />'
		+'		</div>'
		+'		<div class="ui-block-b">'
		+'			<input type="number" name="number" id="spc'+this.id+'" class="ui-input-numb-spec fill" />'
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
