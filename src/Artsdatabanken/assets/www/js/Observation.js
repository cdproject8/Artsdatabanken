function Observation(){

	this.species = new Array();

	this.gpsloc;
	this.location;
	
	this.activeExtended;
	
 	$('#observation_form').click(function(e) {
  		var tar = $(e.target);
  		if (tar.is('a, .add_info')) {
			this.activeExtended = tar.parent().attr("id").substr(11);
			console.log(this.activeExtended);
		}
   	});
	
	// TODO make dynamic for each
			//console.log("../data/autocomplete/89.json" instanceof Array);
	var ac = new Autocomplete("../../data/autocomplete/89.json", function(f) {
	console.log( f)
	});
	
	this.newSpecies = function() {
		newSpec = new ObsSpec(this.len());
		this.species.push(newSpec);
		$('#observation_form').append(newSpec.speciesListHtml().trigger('create'));
		ac.activate("#species_row"+newSpec.id +" .ui-input-name-spec");
	}
	
	this.len = function() {
		return this.species.length;
	}
	
}
