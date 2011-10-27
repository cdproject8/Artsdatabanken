//var glPosition = null
/*
var glSuccess = function(position) {
	glPosition = position
	$("#lat").attr("value", position.coords.latitude)
	$("#long").attr("value", position.coords.longitude)
	$("#alt").attr("value", position.coords.altitude)
	$("#acc").attr("value", position.coords.altitudeAccuracy)
	$("#time").attr("value", new Date(position.timestamp))
};
*/

function glSuccess(position) {
	observation.longitude = position.coords.longitude;
	observation.latitude = position.coords.latitude;
	$("#obs-long").val(observation.longitude);
	$("#obs-lat").val(observation.latitude);
}

var glError = function(error) {
	alert(error.message);
};

function getPosition() {
	$("#obs-long").val("Fetching GPS");
	$("#obs-lat").val("max 10s");
	navigator.geolocation.getCurrentPosition(glSuccess, glError, {maximumAge: 2000, enableHighAccuracy: true, timeout: 10000});
}

/*
function watchPosition() {
	navigator.geolocation.watchPosition(glSuccess, glError, {enableHighAccuracy: true});
}
*/
