
var camSuccess = function(image) {
	//do something real here, for now just replaces the image on the page
	img = document.getElementById('testimg');
	img.src = "data:image/jpeg;base64," + image;
};

var camError = function(error) {
	alert(error);
}

function takePicture() {
	navigator.camera.getPicture(camSuccess, camError, {quality: 50, targetWidth: 640, targetHeight: 480})
}