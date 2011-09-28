function ObservationDao(obsId) {
	this.obsId = obsId;
	this.readFile(filename) {
		var reader = new FileReader();
		reader.onloadend = function(evt) {
			console.log(evt.target.result);
		};
		reader.readAsDataURL(file);
	}

	this.createObsFile() {
		
	}
	
	this.write(){
	}
}
