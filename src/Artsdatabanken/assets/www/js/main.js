//GLOBAL VARS
var observation;

// Init jQuery mobile

	$(document).bind("mobileinit", function() {
		// jQuery mobile configuration
		$.extend($.mobile, {
			// Config..
		});
		$.mobile.page.prototype.options.addBackBtn = true;
		//$.mobile.page.prototype.options.domCache = true;
		
		// This will be executed when jQuery mobile is loaded,
		// place code here..
		
		console.log("mobileinit");

		$(document).ready(function() {
			$('#obs_bird').live('pagecreate',function(event){
			
				observation = new Observation();
				observation.newSpecies();
			});
			$('#extended_inf').live('pagecreate',function(event){
				add_autocomplete(".name");
				// make dynamic
			});
			$('#ac_test_page').live('pagecreate',function(event){
				add_autocomplete("#spcac-sandbox1");
				add_autocomplete("#spcac-sandbox2");
			});
		});
});
	

//phonegap replacement function for $(document).ready
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() {
}

function zero_pad(number, len) {
	var num = number+"";
	while (num.length < len) {
		num = "0" + num;
	}
	return num;
}

function add_species(){
	//species_count++;
	if (observation.len() == 999) {
		alert("You have reached the maximum amount of species for one observation, please create a new observation instead");
		return;
	}
	
	observation.newSpecies();
}