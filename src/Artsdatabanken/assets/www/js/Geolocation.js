var glPosition = null

var glSuccess = function(position) {
	gposition = position
	document.getElementById("lat").value = position.coords.latitude;
	document.getElementById("long").value = position.coords.longitude;
	document.getElementById("alt").value = position.coords.altitude;
	document.getElementById("acc").value = position.coords.altitudeAccuracy;
	document.getElementById("time").value = new Date(position.timestamp);
}

var glError = function(error) {
	alert(error.message);
}

function getPosition() {
	navigator.geolocation.getCurrentPosition(glSuccess, glError, {enableHighAccuracy: true});
}

function watchPosition() {
	navigator.geolocation.watchPosition(glSuccess, glError, {enableHighAccuracy: true});
}