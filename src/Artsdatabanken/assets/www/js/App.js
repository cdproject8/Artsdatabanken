function AppClass() {
	this.VERSION = 0.3;
	this.dao = null;
	
	this.init = function() {
		$("#App-version").html(this.VERSION);
		this.dao = new ObservationDao();
	};
}

var App = new AppClass();
