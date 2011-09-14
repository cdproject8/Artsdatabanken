// Init jQuery mobile
$(document).bind("mobileinit", function() {
	// jQuery mobile configuration
	$.extend($.mobile, {
		// Config..
	});
	$.mobile.page.prototype.options.addBackBtn = true;
	

	// This will be executed when jQuery mobile is loaded,
	// place code here..
});

//phonegap replacement function for $(document).ready
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady(){

}

$(document).ready(function() {
	// This is baddy, this won'd work with phonegap, also the constant ajax calls will nullify it
}); //end doc.ready

$("#obs_bird").live('pagecreate',function(event){
/*
	$(".extended_options").hide(); // hide by default
	$(".add_info").toggle(
		function(){
			$(".extended_options",$(this).parent()).show('slow');},
		function(){
			$(".extended_options",$(this).parent()).hide('slow');}
		);
*/

});

//back button 
$('.ui-btn-back').live('tap',function() {
	history.back(); return false;
	}).live('click',function() {
	return false;
});