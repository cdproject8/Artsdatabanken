$(document).ready(function(){
	module("ObservationDao");

	test("should be able to connect to database", function() {
		var dao = new ObservationDao();
		ok(dao.connect().version, "Database has version property");
	});
});