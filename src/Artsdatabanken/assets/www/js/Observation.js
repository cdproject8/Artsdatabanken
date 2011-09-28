function Observation(){

	this.species = new Array();

	this.gpsloc;
	this.location;

/*
	this.addSpecies = function(newSpecies) {
		this.species.push(newSpecies);
	}
*/

	this.newSpecies = function() {
		newSpec = new ObsSpec(this.len());
		this.species.push(newSpec);
		return newSpec;
	}
	
	this.len = function() {
		return this.species.length;
	}
	
}
