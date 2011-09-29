var glPosition = null

var glSuccess = function(position) {
	gposition = position
	$("#lat").attr("value", position.coords.latitude)
	$("#long").attr("value", position.coords.longitude)
	$("#alt").attr("value", position.coords.altitude)
	$("#acc").attr("value", position.coords.altitudeAccuracy)
	$("#time").attr("value", new Date(position.timestamp))
};

var glError = function(error) {
	alert(error.message);
};

function getPosition() {
	navigator.geolocation.getCurrentPosition(glSuccess, glError, {maximumAge: 2000, enableHighAccuracy: true});
}

function watchPosition() {
	navigator.geolocation.watchPosition(glSuccess, glError, {enableHighAccuracy: true});
}