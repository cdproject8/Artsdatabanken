//GLOBAL VARS
var specGroupId;
var observation;
var observationId = null;
var observationList;
// Init jQuery mobile

$(document).bind("mobileinit", function() {
	// jQuery mobile configuration
	$.extend($.mobile, {
		// Config..
	});
	$.mobile.page.prototype.options.addBackBtn = true;
	$.mobile.page.prototype.options.backBtnText = "Tilbake";
	//$.mobile.page.prototype.options.domCache = true;
	
	// This will be executed when jQuery mobile is loaded,
	// place code here..
	
	console.log("mobileinit");


	$(document).ready(function() { 
		
		//kommenter bort linja under f�r du laster den opp p� telefonen, ellers kr�sjer alt.
		App.init();
		
		//JQuery ready
		
		$('#observation').live('pagecreate',function(event){
		
			observation = new Observation(specGroupId, observationId);
			if (observationId == null) observation.newSpecies();
		});
		$('#observation').live('pageshow',function(event){
			// update info on the row that was edited in extended info
			if (observation.activeExtended != null) observation.updateMainPage();
		});
		/* event doesn't work
		$('#observation').live('pagebeforechange', function(event, data){
			console.log("changing from observation");
			if ( !observation.saved && confirm("Are you sure you want to leave the observation page, unsaved information will be lost")) { 
				console.log("leaving obs");
			}
			else {
				event.preventDefault();
			}
		});
		*/
		// Disable caching of observation page, so that when clicking
		// new observation, the previous one is not opened and pagecreate is 	
		// triggered again
		$('#observation').live('pagehide',function(event, data){
			if (!data.nextPage.is("#extended_inf")) {
				jQuery(event.target).remove();
				App.dao.countObservation(observation.id, function(result){
					if (parseInt(result.item(0).num) == 0) {
						console.log("removing empty observation "+observation.id);
						observation.deleteObs();
					}
				}, null);
			}
		});

		$('#submit').live('pagebeforeshow',function(event){
			observation.saveToDao();
		});

		$('#extended_inf').live('pagecreate',function(event){
			$(".name").speciesAutocomplete({data: observation.autocompleteFile});
			observation.fillExtended();
		});	
		$('#extended_inf').live('pagebeforehide',function(event){
			observation.saveExtended();
			
		});
		// If observationId is null then a new observation is created
		$('#species_select').live('pagebeforeshow',function(event){
			observationId = null;
		});
		
		$('#list_observations').live('pagecreate',function(event){
			//populateObservationList();
			observationList = new ObservationList();
			observationList.populateList();
		});		
		$('#view_observation').live('pagebeforeshow',function(event){
			//populateSpeciesList();
		});		
		$('#view_species').live('pagebeforeshow',function(event){
			//viewSpecies();
		});		
	});
});
	

//phonegap replacement function for $(document).ready
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() {
	//PhoneGap ready
	App.init();
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

Android.sendEmail = function(subject, body) { 
  var extras = {};
  extras[WebIntent.EXTRA_SUBJECT] = subject;
  extras[WebIntent.EXTRA_TEXT] = body;
  window.plugins.webintent.startActivity({ 
      action: WebIntent.ACTION_SEND,
      type: 'text/plain', 
      extras: extras 
    }, 
    function() {}, 
    function() {
      alert('Failed to send email via Android Intent');
    }
  ); 
};
