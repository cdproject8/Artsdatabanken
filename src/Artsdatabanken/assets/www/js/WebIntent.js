/**
 * Phonegap Web Intent plugin
 * Copyright (c) Boris Smus 2010
 *
 */
var WebIntent = function() { 

};

WebIntent.ACTION_SEND = "android.content.Intent.ACTION_SEND";
WebIntent.ACTION_VIEW= "android.intent.action.VIEW";
WebIntent.EXTRA_TEXT = "android.content.Intent.EXTRA_TEXT";
WebIntent.EXTRA_SUBJECT = "android.content.Intent.EXTRA_SUBJECT";

WebIntent.prototype.startActivity = function(params, success, fail) {
	return PhoneGap.exec(function(args) {
        success(args);
    }, function(args) {
        fail(args);
    }, 'WebIntent', 'startActivity', [params]);
};

WebIntent.prototype.hasExtra = function(params, success, fail) {
	return PhoneGap.exec(function(args) {
        success(args);
    }, function(args) {
        fail(args);
    }, 'WebIntent', 'hasExtra', [params]);
};

WebIntent.prototype.getExtra = function(params, success, fail) {
	return PhoneGap.exec(function(args) {
        success(args);
    }, function(args) {
        fail(args);
    }, 'WebIntent', 'getExtra', [params]);
};

WebIntent.prototype.getDataString = function(success, fail) {
	return PhoneGap.exec(function(args) {
        success(args);
    }, function(args) {
        fail(args);
    }, 'WebIntent', 'getDataString', []);
};

PhoneGap.addConstructor(function() {
	PhoneGap.addPlugin('webintent', new WebIntent());
	PluginManager.addService("WebIntent","com.borismus.webintent.WebIntent");
});
