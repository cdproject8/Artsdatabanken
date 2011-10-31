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
//		App.init();
		
		//JQuery ready
		
		$('#observation').live('pagecreate',function(event){
		
			observation = new Observation(specGroupId, observationId);
		});
		$('#observation').live('pageshow',function(event){
			// if returning from extended info page
			// update info on the row that was edited
			observation.updateMainPage();
		});
		// Disable caching of observation page, so that when clicking
		// new observation, the previous one is not opened and pagecreate is 	
		// triggered again
		$('#observation').live('pagehide',function(event, data){
			if (!data.nextPage.is("#extended_inf")) {
				jQuery(event.target).remove();
				App.dao.countObservation(observation.id, function(result){
					if (parseInt(result.item(0).num) == 0) {
						// Deleting observation after leaving it's page if no entries where saved in it
						observation.deleteObs(true);
					}
				}, null);
			}
		});

		$('#extended_inf').live('pagecreate',function(event){
			observation.fillExtended();
		});	
		$('#extended_inf').live('pageshow',function(event){
			observation.activeExtended.addActivityBox();
		});
		$('#extended_inf').live('pagebeforehide',function(event){
			observation.saveExtended();			
		});
		// If observationId is null then a new observation is created
		$('#species_select').live('pagebeforeshow',function(event){
			observationId = null;
		});
		
		$('#list_observations').live('pagecreate',function(event){
			observationList = new ObservationList();
		});
		// Make sure the observationList is refreshed every time it loads
		$('#list_observations').live('pagehide',function(event, data){
			jQuery(event.target).remove();
		});
	});
});
	

//phonegap replacement function for $(document).ready
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() {
	// PhoneGap ready
	App.init();
	// alert('phonegap ready')
}

Date.prototype.toString = function(){
	var date = zero_pad(this.getDate(),2) + "." + zero_pad(this.getMonth()+1,2) + "." + this.getFullYear();
	date += "\t"+ zero_pad(this.getHours(),2) + ":" + zero_pad(this.getMinutes(),2);
	return date;
};

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

var Android = {};
Android.sendEmail = function(subject, body) {
  if (!window.plugins || !window.plugins.webintent) {
	    alert('Unable to find webintent plugin');
    return false;
  }
  var extras = {};
  extras[WebIntent.EXTRA_SUBJECT] = subject;
  extras[WebIntent.EXTRA_TEXT] = body;
  window.plugins.webintent.startActivity({
    action: WebIntent.ACTION_SEND,
    type: 'text/plain',
    extras: extras
  }, function() {}, function() {alert('Failed to send email via Android Intent');});
};
		
