$(document).ready(function(){
	module("Module zeroPadding");

	test("pad 1,2 to 01", function() {
		equal("01", zero_pad(1,2));
	});
	test("pad 10,2 to 10", function() {
		equal("10", zero_pad(10,2));
	});
	test("pad 0,3 to 000", function() {
		equal("000", zero_pad(0,3));
	});
	test("pad 1,3 to 001", function() {
		equal("001", zero_pad(1,3));
	});
	
	module("species observation");

	var id = 4;
	var spec = new ObsSpec(id);
	
	test("new species", function() {
		equal("004", spec.id);
	});
	

	module("observation");
	var obs = new Observation();	
	
	obs.addSpecies(spec);
	test("get species", function() {
		equal(spec.id, obs.getSpecies(spec.id).id);
	});
	
	obs.newSpecies();
	var newestSpecies = obs.species[obs.len()-1];
	
	test("new species id", function() {
		equal(newestSpecies.id, "005");
	});
	
	test("new species dates equal to previous", function() {
		equal(newestSpecies.date_start.getTime(), spec.date_start.getTime());
		equal(newestSpecies.date_end.getTime(), spec.date_end.getTime());
	});

});
