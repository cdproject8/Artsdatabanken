$(document).ready(function(){
	module("dao");
	
	test("should be able to open file", 1, function() {
		var reader = new FileReader();
		reader.onload = function(evt) {
			ok(true);
		};
	    reader.readAsDataURL("tests/resources/dao.txt");
	});
});