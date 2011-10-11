//GLOBAL VARS
var observation;
var observationId;

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

		dbInit();			

		//JQuery ready
		
		$('#obs_bird').live('pagecreate',function(event){
		
			observation = new Observation();
			observation.newSpecies();
		});
		$('#obs_bird').live('pageshow',function(event){
			// update info on the row that was edited in extended info
			if (observation.activeExtended != null) observation.updateMainPage();
		});
		$('#submit').live('pagebeforeshow',function(event){
			storeObservation(observation);
		});
		$('#extended_inf').live('pagecreate',function(event){
			observation.ac.activate(".name");
			observation.fillExtendedValues();
		});
		$('#extended_inf').live('pagebeforehide',function(event){
			observation.saveExtended();
			
		});
		$('#list_observations').live('pagebeforeshow',function(event){
			populateObservationList();
		});		
		$('#view_observation').live('pagebeforeshow',function(event){
			populateSpeciesList();
		});		
		$('#view_species').live('pagebeforeshow',function(event){
			viewSpecies();
		});		
	});
});
	

//phonegap replacement function for $(document).ready
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() {
	//PhoneGap ready
	dbInit();
//	alert('phonegap ready')
}

function zero_pad(number, len) {
	var num = number+"";
	while (num.length < len) {
		num = "0" + num;
	}
	return num;
}

function add_species(){
	if (observation.len() == 999) {
		alert("You have reached the maximum amount of species for one observation, please create a new observation instead");
		return;
	}
	
	observation.newSpecies();
}

//this code is stolen and probably temporary if i find a better solution
$.extend({
	  getUrlVars: function(){
	    var vars = [], hash;
	    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	    for(var i = 0; i < hashes.length; i++)
	    {
	      hash = hashes[i].split('=');
	      vars.push(hash[0]);
	      vars[hash[0]] = hash[1];
	    }
	    return vars;
	  },
	  getUrlVar: function(name){
	    return $.getUrlVars()[name];
	  }
});