//phonegap replacement function for $(document).ready
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady(){

}

$(document).ready(function() {
	// This is baddy, this won'd work with phonegap, also the constant ajax calls will nullify it
}); //end doc.ready

$("#obs_bird").live('pagecreate',function(event){
	$(".extended_options").hide();
	$(".add_info").toggle(
		function(){
			$(".extended_options",$(this).parent()).hide('slow');},
		function(){
			$(".extended_options",$(this).parent()).show('slow');}
		);
});
