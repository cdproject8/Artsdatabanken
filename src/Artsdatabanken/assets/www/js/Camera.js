
var camSuccess = function(uri) {
	//do something real here, for now just replaces the image on the page
//	$("#testimg").attr("src", "data:image/jpeg;base64," + image);
	$("#testimg").attr("src", uri);
};

var camError = function(error) {
	alert(error);
}

function takePictureAsData() {
	navigator.camera.getPicture(camSuccess, camError, {
		quality: 90, 
		targetWidth: 640, 
		targetHeight: 480
	})
}

function takePictureAsURI() {
	navigator.camera.getPicture(camSuccess, camError, {
		quality: 90, 
		targetWidth: 640, 
		targetHeight: 480, 
		destinationType: navigator.camera.DestinationType.FILE_URI
	})
}

function retrievePicture() {
	navigator.camera.getPicture(camSuccess, camError, {
		targetWidth: 640,
		targetHeight:480,
		destinationType: navigator.camera.DestinationType.FILE_URI,
		sourceType: navigator.camera.PictureSourceType.PHOTOLIBRARY
	})
}