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

		$(document).ready(function() {
			$('#obs_bird').live('pagecreate',function(event){
				add_autocomplete("#spe001")
			});
			$('#ac_test_page').live('pagecreate',function(event){
				add_autocomplete("#spcac-sandbox1")
				add_autocomplete("#spcac-sandbox2")
			});
		});		
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
	if (species_count == 999) {
		alert("You have reached the maximum amount of species for one observation, please create a new observation instead");
		return;
	}
	var new_spec = $('#species_row').clone()
	var zeropad = zero_pad(species_count,3);
	$('input[id=spe001]', new_spec).attr("id","spe"+zeropad);
	$('input[id=spc001]', new_spec).attr("id","spc"+zeropad);
	
	new_spec.appendTo('#observation_form');
	
	add_autocomplete("#spe"+zeropad);
}

function add_autocomplete(inputid) {
	var data = autocompleteData();
	$(inputid).autocomplete({
		source: function(request, response) {
			var currentText = $.ui.autocomplete.escapeRegex(request.term);
			var matcher = new RegExp( "^" + currentText, "i" );
			var count = 0;
			var suggestions = $.grep(data, function(item, index){
				if (count > 5) return false;
				var res = matcher.test(item)
				if (res) count++;
				return res;
			});
			response(suggestions);
		}
	});
}
