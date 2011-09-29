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
	
	module("observation");


});
