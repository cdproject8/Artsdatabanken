function ObservationDao() {
	this.readFile(filename) {
		var reader = new FileReader();
		reader.onloadend = function(evt) {
			console.log(evt.target.result);
		};
		reader.readAsDataURL(file);
	}

	this.write(filename, data) {
		
	}
}
