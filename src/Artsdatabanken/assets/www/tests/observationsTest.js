$(document).ready(function(){
	module("Module zeroPadding");

	test("pad 1 to 01", function() {
		equal("01", zero_pad(1,2));
	});
	test("pad 10 to 10", function() {
		equal("10", zero_pad(10,2));
	});

});