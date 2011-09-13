$(document).ready(function(){
	test("a basic test example", function() {
		ok( true, "this test is fine" );
		var value = "hello";
		equal( value, "hello", "We expect value to be hello" );
	});

	module("Module A");

	test("first test within module", function() {
		ok( true, "all pass" );
	});

	test("second test within module", function() {
		ok( true, "all pass" );
	});

	module("Module B");

	test("some other test", function() {
		expect(2);
		equal( true, false, "failing test" );
		equal( true, true, "passing test" );
	});

	// Expects one assertion
	asyncTest("some mocking", 1, function() {
		// Mock response
		$.mockjax({
		  url: '/restful/fortune',
		  responseTime: 200,
		  responseText: {
			status: 'success',
			fortune: 'Are you a turtle?'
		  }
		});

		// Actual request
		$.getJSON('/restful/fortune', function(response) {
			if ( response.status == 'success') {
				equal(response.fortune, "Are you a turtle?"); 
			} 
			start();
		});
	});
});
