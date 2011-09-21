//GLOBAL VARS
var species_count=1;

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
});

//phonegap replacement function for $(document).ready
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady() {
}

function zero_pad(number, length) {
    var num = number+"";
    while (num.length < length) {
        num = "0" + num;
    }
    return num;
}

function add_species(){
	species_count++;
	var new_spec = $('#species_row').clone()
	$('input[id=spe01]', new_spec).attr("id","spe"+zero_pad(species_count,2));
	$('input[id=spc01]', new_spec).attr("id","spc"+zero_pad(species_count,2));
	
	new_spec.appendTo('#observation_form');
}

$(document).ready(function() {
	var data = autocompleteData();
	$("#species-autocomplete").autocomplete({
		 source: function(request, response) {
		        var currentText = $.ui.autocomplete.escapeRegex(request.term);
		        var matcher = new RegExp( "^" + currentText, "i" );
		        var count = 0;
		        var suggestions = $.grep( data, function(item,index){
		        	if (count > 5) return false;
		        	var res = matcher.test(item)
		        	if (res) count++;
		            return res;
		        });
		        response(suggestions);
		    }
	});
});