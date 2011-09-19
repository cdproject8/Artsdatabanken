// Init jQuery mobile
$(document).bind("mobileinit", function() {
	// jQuery mobile configuration
	$.extend($.mobile, {
		// Config..
	});
	$.mobile.page.prototype.options.addBackBtn = true;
	//$.mobile.page.prototype.options.domCache = true;
	
	// This will be executed when jQuery mobile is loaded,
	// place code here..
	
	console.log("mobileinit");
});

//phonegap replacement function for $(document).ready
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() {
	console.log("deviceready");
}