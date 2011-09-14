/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (typeof PhoneGap === "undefined") {

/**
 * The order of events during page load and PhoneGap startup is as follows:
 *
 * onDOMContentLoaded         Internal event that is received when the web page is loaded and parsed.
 * window.onload              Body onload event.
 * onNativeReady              Internal event that indicates the PhoneGap native side is ready.
 * onPhoneGapInit             Internal event that kicks off creation of all PhoneGap JavaScript objects (runs constructors).
 * onPhoneGapReady            Internal event fired when all PhoneGap JavaScript objects have been created
 * onPhoneGapInfoReady        Internal event fired when device properties are available
 * onDeviceReady              User event fired to indicate that PhoneGap is ready
 * onResume                   User event fired to indicate a start/resume lifecycle event
 * onPause                    User event fired to indicate a pause lifecycle event
 * onDestroy                  Internal event fired when app is being destroyed (User should use window.onunload event, not this one).
 *
 * The only PhoneGap events that user code should register for are:
 *      onDeviceReady
 *      onResume
 *
 * Listeners can be registered as:
 *      document.addEventListener("deviceready", myDeviceReadyListener, false);
 *      document.addEventListener("resume", myResumeListener, false);
 *      document.addEventListener("pause", myPauseListener, false);
 */

if (typeof(DeviceInfo) !== 'object') {
    var DeviceInfo = {};
}

/**
 * This represents the PhoneGap API itself, and provides a global namespace for accessing
 * information about the state of PhoneGap.
 * @class
 */
var PhoneGap = {
    queue: {
        ready: true,
        commands: [],
        timer: null
    }
};

/**
 * List of resource files loaded by PhoneGap.
 * This is used to ensure JS and other files are loaded only once.
 */
PhoneGap.resources = {base: true};

/**
 * Determine if resource has been loaded by PhoneGap
 *
 * @param name
 * @return
 */
PhoneGap.hasResource = function(name) {
    return PhoneGap.resources[name];
};

/**
 * Add a resource to list of loaded resources by PhoneGap
 *
 * @param name
 */
PhoneGap.addResource = function(name) {
    PhoneGap.resources[name] = true;
};

/**
 * Custom pub-sub channel that can have functions subscribed to it
 * @constructor
 */
PhoneGap.Channel = function (type)
{
    this.type = type;
    this.handlers = {};
    this.guid = 0;
    this.fired = false;
    this.enabled = true;
};

/**
 * Subscribes the given function to the channel. Any time that
 * Channel.fire is called so too will the function.
 * Optionally specify an execution context for the function
 * and a guid that can be used to stop subscribing to the channel.
 * Returns the guid.
 */
PhoneGap.Channel.prototype.subscribe = function(f, c, g) {
    // need a function to call
    if (f === null) { return; }

    var func = f;
    if (typeof c === "object" && typeof f === "function") { func = PhoneGap.close(c, f); }

    g = g || func.observer_guid || f.observer_guid || this.guid++;
    func.observer_guid = g;
    f.observer_guid = g;
    this.handlers[g] = func;
    return g;
};

/**
 * Like subscribe but the function is only called once and then it
 * auto-unsubscribes itself.
 */
PhoneGap.Channel.prototype.subscribeOnce = function(f, c) {
    var g = null;
    var _this = this;
    var m = function() {
        f.apply(c || null, arguments);
        _this.unsubscribe(g);
    };
    if (this.fired) {
        if (typeof c === "object" && typeof f === "function") { f = PhoneGap.close(c, f); }
        f.apply(this, this.fireArgs);
    } else {
        g = this.subscribe(m);
    }
    return g;
};

/**
 * Unsubscribes the function with the given guid from the channel.
 */
PhoneGap.Channel.prototype.unsubscribe = function(g) {
    if (typeof g === "function") { g = g.observer_guid; }
    this.handlers[g] = null;
    delete this.handlers[g];
};

/**
 * Calls all functions subscribed to this channel.
 */
PhoneGap.Channel.prototype.fire = function(e) {
    if (this.enabled) {
        var fail = false;
        var item, handler, rv;
        for (item in this.handlers) {
            if (this.handlers.hasOwnProperty(item)) {
                handler = this.handlers[item];
                if (typeof handler === "function") {
                    rv = (handler.apply(this, arguments) === false);
                    fail = fail || rv;
                }
            }
        }
        this.fired = true;
        this.fireArgs = arguments;
        return !fail;
    }
    return true;
};

/**
 * Calls the provided function only after all of the channels specified
 * have been fired.
 */
PhoneGap.Channel.join = function(h, c) {
    var i = c.length;
    var f = function() {
        if (!(--i)) {
            h();
        }
    };
    var len = i;
    var j;
    for (j=0; j<len; j++) {
        if (!c[j].fired) {
            c[j].subscribeOnce(f);
        }
        else {
            i--;
        }
    }
    if (!i) {
        h();
    }
};

/**
 * Boolean flag indicating if the PhoneGap API is available and initialized.
 */ // TODO: Remove this, it is unused here ... -jm
PhoneGap.available = DeviceInfo.uuid !== undefined;

/**
 * Add an initialization function to a queue that ensures it will run and initialize
 * application constructors only once PhoneGap has been initialized.
 * @param {Function} func The function callback you want run once PhoneGap is initialized
 */
PhoneGap.addConstructor = function(func) {
    PhoneGap.onPhoneGapInit.subscribeOnce(function() {
        try {
            func();
        } catch(e) {
            console.log("Failed to run constructor: " + e);
        }
    });
};

/**
 * Plugins object
 */
if (!window.plugins) {
    window.plugins = {};
}

/**
 * Adds a plugin object to window.plugins.
 * The plugin is accessed using window.plugins.<name>
 *
 * @param name          The plugin name
 * @param obj           The plugin object
 */
PhoneGap.addPlugin = function(name, obj) {
    if (!window.plugins[name]) {
        window.plugins[name] = obj;
    }
    else {
        console.log("Error: Plugin "+name+" already exists.");
    }
};

/**
 * onDOMContentLoaded channel is fired when the DOM content
 * of the page has been parsed.
 */
PhoneGap.onDOMContentLoaded = new PhoneGap.Channel('onDOMContentLoaded');

/**
 * onNativeReady channel is fired when the PhoneGap native code
 * has been initialized.
 */
PhoneGap.onNativeReady = new PhoneGap.Channel('onNativeReady');

/**
 * onPhoneGapInit channel is fired when the web page is fully loaded and
 * PhoneGap native code has been initialized.
 */
PhoneGap.onPhoneGapInit = new PhoneGap.Channel('onPhoneGapInit');

/**
 * onPhoneGapReady channel is fired when the JS PhoneGap objects have been created.
 */
PhoneGap.onPhoneGapReady = new PhoneGap.Channel('onPhoneGapReady');

/**
 * onPhoneGapInfoReady channel is fired when the PhoneGap device properties
 * has been set.
 */
PhoneGap.onPhoneGapInfoReady = new PhoneGap.Channel('onPhoneGapInfoReady');

/**
 * onPhoneGapConnectionReady channel is fired when the PhoneGap connection properties
 * has been set.
 */
PhoneGap.onPhoneGapConnectionReady = new PhoneGap.Channel('onPhoneGapConnectionReady');

/**
 * onResume channel is fired when the PhoneGap native code
 * resumes.
 */
PhoneGap.onResume = new PhoneGap.Channel('onResume');

/**
 * onPause channel is fired when the PhoneGap native code
 * pauses.
 */
PhoneGap.onPause = new PhoneGap.Channel('onPause');

/**
 * onDestroy channel is fired when the PhoneGap native code
 * is destroyed.  It is used internally.
 * Window.onunload should be used by the user.
 */
PhoneGap.onDestroy = new PhoneGap.Channel('onDestroy');
PhoneGap.onDestroy.subscribeOnce(function() {
    PhoneGap.shuttingDown = true;
});
PhoneGap.shuttingDown = false;

// _nativeReady is global variable that the native side can set
// to signify that the native code is ready. It is a global since
// it may be called before any PhoneGap JS is ready.
if (typeof _nativeReady !== 'undefined') { PhoneGap.onNativeReady.fire(); }

/**
 * onDeviceReady is fired only after all PhoneGap objects are created and
 * the device properties are set.
 */
PhoneGap.onDeviceReady = new PhoneGap.Channel('onDeviceReady');


// Array of channels that must fire before "deviceready" is fired
PhoneGap.deviceReadyChannelsArray = [ PhoneGap.onPhoneGapReady, PhoneGap.onPhoneGapInfoReady, PhoneGap.onPhoneGapConnectionReady];

// Hashtable of user defined channels that must also fire before "deviceready" is fired
PhoneGap.deviceReadyChannelsMap = {};

/**
 * Indicate that a feature needs to be initialized before it is ready to be used.
 * This holds up PhoneGap's "deviceready" event until the feature has been initialized
 * and PhoneGap.initComplete(feature) is called.
 *
 * @param feature {String}     The unique feature name
 */
PhoneGap.waitForInitialization = function(feature) {
    if (feature) {
        var channel = new PhoneGap.Channel(feature);
        PhoneGap.deviceReadyChannelsMap[feature] = channel;
        PhoneGap.deviceReadyChannelsArray.push(channel);
    }
};

/**
 * Indicate that initialization code has completed and the feature is ready to be used.
 *
 * @param feature {String}     The unique feature name
 */
PhoneGap.initializationComplete = function(feature) {
    var channel = PhoneGap.deviceReadyChannelsMap[feature];
    if (channel) {
        channel.fire();
    }
};

/**
 * Create all PhoneGap objects once page has fully loaded and native side is ready.
 */
PhoneGap.Channel.join(function() {

    // Start listening for XHR callbacks
    setTimeout(function() {
            if (PhoneGap.UsePolling) {
                PhoneGap.JSCallbackPolling();
            }
            else {
                var polling = prompt("usePolling", "gap_callbackServer:");
                PhoneGap.UsePolling = polling;
                if (polling == "true") {
                    PhoneGap.UsePolling = true;
                    PhoneGap.JSCallbackPolling();
                }
                else {
                    PhoneGap.UsePolling = false;
                    PhoneGap.JSCallback();
                }
            }
        }, 1);

    // Run PhoneGap constructors
    PhoneGap.onPhoneGapInit.fire();

    // Fire event to notify that all objects are created
    PhoneGap.onPhoneGapReady.fire();

    // Fire onDeviceReady event once all constructors have run and PhoneGap info has been
    // received from native side, and any user defined initialization channels.
    PhoneGap.Channel.join(function() {
        PhoneGap.onDeviceReady.fire();

        // Fire the onresume event, since first one happens before JavaScript is loaded
        PhoneGap.onResume.fire();
    }, PhoneGap.deviceReadyChannelsArray);

}, [ PhoneGap.onDOMContentLoaded, PhoneGap.onNativeReady ]);

// Listen for DOMContentLoaded and notify our channel subscribers
document.addEventListener('DOMContentLoaded', function() {
    PhoneGap.onDOMContentLoaded.fire();
}, false);

// Intercept calls to document.addEventListener and watch for deviceready
PhoneGap.m_document_addEventListener = document.addEventListener;

document.addEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();
    if (e === 'deviceready') {
        PhoneGap.onDeviceReady.subscribeOnce(handler);
    } else if (e === 'resume') {
        PhoneGap.onResume.subscribe(handler);
        if (PhoneGap.onDeviceReady.fired) {
            PhoneGap.onResume.fire();
        }
    } else if (e === 'pause') {
        PhoneGap.onPause.subscribe(handler);
    }
    else {
        // If subscribing to Android backbutton
        if (e === 'backbutton') {
            PhoneGap.exec(null, null, "App", "overrideBackbutton", [true]);
        }

        PhoneGap.m_document_addEventListener.call(document, evt, handler, capture);
    }
};

// Intercept calls to document.removeEventListener and watch for events that
// are generated by PhoneGap native code
PhoneGap.m_document_removeEventListener = document.removeEventListener;

document.removeEventListener = function(evt, handler, capture) {
    var e = evt.toLowerCase();

    // If unsubscribing to Android backbutton
    if (e === 'backbutton') {
        PhoneGap.exec(null, null, "App", "overrideBackbutton", [false]);
    }

    PhoneGap.m_document_removeEventListener.call(document, evt, handler, capture);
};

/**
 * Method to fire event from native code
 */
PhoneGap.fireEvent = function(type) {
    var e = document.createEvent('Events');
    e.initEvent(type);
    document.dispatchEvent(e);
};

/**
 * If JSON not included, use our own stringify. (Android 1.6)
 * The restriction on ours is that it must be an array of simple types.
 *
 * @param args
 * @return {String}
 */
PhoneGap.stringify = function(args) {
    if (typeof JSON === "undefined") {
        var s = "[";
        var i, type, start, name, nameType, a;
        for (i = 0; i < args.length; i++) {
            if (args[i] !== null) {
                if (i > 0) {
                    s = s + ",";
                }
                type = typeof args[i];
                if ((type === "number") || (type === "boolean")) {
                    s = s + args[i];
                } else if (args[i] instanceof Array) {
                    s = s + "[" + args[i] + "]";
                } else if (args[i] instanceof Object) {
                    start = true;
                    s = s + '{';
                    for (name in args[i]) {
                        if (args[i][name] !== null) {
                            if (!start) {
                                s = s + ',';
                            }
                            s = s + '"' + name + '":';
                            nameType = typeof args[i][name];
                            if ((nameType === "number") || (nameType === "boolean")) {
                                s = s + args[i][name];
                            } else if ((typeof args[i][name]) === 'function') {
                                // don't copy the functions
                                s = s + '""';
                            } else if (args[i][name] instanceof Object) {
                                s = s + PhoneGap.stringify(args[i][name]);
                            } else {
                                s = s + '"' + args[i][name] + '"';
                            }
                            start = false;
                        }
                    }
                    s = s + '}';
                } else {
                    a = args[i].replace(/\\/g, '\\\\');
                    a = a.replace(/"/g, '\\"');
                    s = s + '"' + a + '"';
                }
            }
        }
        s = s + "]";
        return s;
    } else {
        return JSON.stringify(args);
    }
};

/**
 * Does a deep clone of the object.
 *
 * @param obj
 * @return {Object}
 */
PhoneGap.clone = function(obj) {
    var i, retVal;
    if(!obj) { 
        return obj;
    }
    
    if(obj instanceof Array){
        retVal = [];
        for(i = 0; i < obj.length; ++i){
            retVal.push(PhoneGap.clone(obj[i]));
        }
        return retVal;
    }
    
    if (typeof obj === "function") {
        return obj;
    }
    
    if(!(obj instanceof Object)){
        return obj;
    }
    
    if (obj instanceof Date) {
        return obj;
    }
    
    retVal = {};
    for(i in obj){
        if(!(i in retVal) || retVal[i] !== obj[i]) {
            retVal[i] = PhoneGap.clone(obj[i]);
        }
    }
    return retVal;
};

PhoneGap.callbackId = 0;
PhoneGap.callbacks = {};
PhoneGap.callbackStatus = {
    NO_RESULT: 0,
    OK: 1,
    CLASS_NOT_FOUND_EXCEPTION: 2,
    ILLEGAL_ACCESS_EXCEPTION: 3,
    INSTANTIATION_EXCEPTION: 4,
    MALFORMED_URL_EXCEPTION: 5,
    IO_EXCEPTION: 6,
    INVALID_ACTION: 7,
    JSON_EXCEPTION: 8,
    ERROR: 9
    };


/**
 * Execute a PhoneGap command.  It is up to the native side whether this action is synch or async.
 * The native side can return:
 *      Synchronous: PluginResult object as a JSON string
 *      Asynchrounous: Empty string ""
 * If async, the native side will PhoneGap.callbackSuccess or PhoneGap.callbackError,
 * depending upon the result of the action.
 *
 * @param {Function} success    The success callback
 * @param {Function} fail       The fail callback
 * @param {String} service      The name of the service to use
 * @param {String} action       Action to be run in PhoneGap
 * @param {Array.<String>} [args]     Zero or more arguments to pass to the method
 */
PhoneGap.exec = function(success, fail, service, action, args) {
    try {
        var callbackId = service + PhoneGap.callbackId++;
        if (success || fail) {
            PhoneGap.callbacks[callbackId] = {success:success, fail:fail};
        }

        var r = prompt(PhoneGap.stringify(args), "gap:"+PhoneGap.stringify([service, action, callbackId, true]));

        // If a result was returned
        if (r.length > 0) {
            eval("var v="+r+";");

            // If status is OK, then return value back to caller
            if (v.status === PhoneGap.callbackStatus.OK) {

                // If there is a success callback, then call it now with
                // returned value
                if (success) {
                    try {
                        success(v.message);
                    } catch (e) {
                        console.log("Error in success callback: " + callbackId  + " = " + e);
                    }

                    // Clear callback if not expecting any more results
                    if (!v.keepCallback) {
                        delete PhoneGap.callbacks[callbackId];
                    }
                }
                return v.message;
            }

            // If no result
            else if (v.status === PhoneGap.callbackStatus.NO_RESULT) {

                // Clear callback if not expecting any more results
                if (!v.keepCallback) {
                    delete PhoneGap.callbacks[callbackId];
                }
            }

            // If error, then display error
            else {
                console.log("Error: Status="+v.status+" Message="+v.message);

                // If there is a fail callback, then call it now with returned value
                if (fail) {
                    try {
                        fail(v.message);
                    }
                    catch (e1) {
                        console.log("Error in error callback: "+callbackId+" = "+e1);
                    }

                    // Clear callback if not expecting any more results
                    if (!v.keepCallback) {
                        delete PhoneGap.callbacks[callbackId];
                    }
                }
                return null;
            }
        }
    } catch (e2) {
        console.log("Error: "+e2);
    }
};

/**
 * Called by native code when returning successful result from an action.
 *
 * @param callbackId
 * @param args
 */
PhoneGap.callbackSuccess = function(callbackId, args) {
    if (PhoneGap.callbacks[callbackId]) {

        // If result is to be sent to callback
        if (args.status === PhoneGap.callbackStatus.OK) {
            try {
                if (PhoneGap.callbacks[callbackId].success) {
                    PhoneGap.callbacks[callbackId].success(args.message);
                }
            }
            catch (e) {
                console.log("Error in success callback: "+callbackId+" = "+e);
            }
        }

        // Clear callback if not expecting any more results
        if (!args.keepCallback) {
            delete PhoneGap.callbacks[callbackId];
        }
    }
};

/**
 * Called by native code when returning error result from an action.
 *
 * @param callbackId
 * @param args
 */
PhoneGap.callbackError = function(callbackId, args) {
    if (PhoneGap.callbacks[callbackId]) {
        try {
            if (PhoneGap.callbacks[callbackId].fail) {
                PhoneGap.callbacks[callbackId].fail(args.message);
            }
        }
        catch (e) {
            console.log("Error in error callback: "+callbackId+" = "+e);
        }

        // Clear callback if not expecting any more results
        if (!args.keepCallback) {
            delete PhoneGap.callbacks[callbackId];
        }
    }
};


/**
 * Internal function used to dispatch the request to PhoneGap.  It processes the
 * command queue and executes the next command on the list.  If one of the
 * arguments is a JavaScript object, it will be passed on the QueryString of the
 * url, which will be turned into a dictionary on the other end.
 * @private
 */
// TODO: Is this used?
PhoneGap.run_command = function() {
    if (!PhoneGap.available || !PhoneGap.queue.ready) {
        return;
    }
    PhoneGap.queue.ready = false;

    var args = PhoneGap.queue.commands.shift();
    if (PhoneGap.queue.commands.length === 0) {
        clearInterval(PhoneGap.queue.timer);
        PhoneGap.queue.timer = null;
    }

    var uri = [];
    var dict = null;
    var i;
    for (i = 1; i < args.length; i++) {
        var arg = args[i];
        if (arg === undefined || arg === null) {
            arg = '';
        }
        if (typeof(arg) === 'object') {
            dict = arg;
        } else {
            uri.push(encodeURIComponent(arg));
        }
    }
    var url = "gap://" + args[0] + "/" + uri.join("/");
    if (dict !== null) {
        var name;
        var query_args = [];
        for (name in dict) {
            if (dict.hasOwnProperty(name) && (typeof (name) === 'string')) {
                query_args.push(encodeURIComponent(name) + "=" + encodeURIComponent(dict[name]));
            }
        }
        if (query_args.length > 0) {
            url += "?" + query_args.join("&");
        }
    }
    document.location = url;

};

PhoneGap.JSCallbackPort = null;
PhoneGap.JSCallbackToken = null;

/**
 * This is only for Android.
 *
 * Internal function that uses XHR to call into PhoneGap Java code and retrieve
 * any JavaScript code that needs to be run.  This is used for callbacks from
 * Java to JavaScript.
 */
PhoneGap.JSCallback = function() {

    // Exit if shutting down app
    if (PhoneGap.shuttingDown) {
        return;
    }

    // If polling flag was changed, start using polling from now on
    if (PhoneGap.UsePolling) {
        PhoneGap.JSCallbackPolling();
        return;
    }

    var xmlhttp = new XMLHttpRequest();

    // Callback function when XMLHttpRequest is ready
    xmlhttp.onreadystatechange=function(){
        if(xmlhttp.readyState === 4){

            // Exit if shutting down app
            if (PhoneGap.shuttingDown) {
                return;
            }

            // If callback has JavaScript statement to execute
            if (xmlhttp.status === 200) {

                // Need to url decode the response
                var msg = decodeURIComponent(xmlhttp.responseText);
                setTimeout(function() {
                    try {
                        var t = eval(msg);
                    }
                    catch (e) {
                        // If we're getting an error here, seeing the message will help in debugging
                        console.log("JSCallback: Message from Server: " + msg);
                        console.log("JSCallback Error: "+e);
                    }
                }, 1);
                setTimeout(PhoneGap.JSCallback, 1);
            }

            // If callback ping (used to keep XHR request from timing out)
            else if (xmlhttp.status === 404) {
                setTimeout(PhoneGap.JSCallback, 10);
            }

            // If security error
            else if (xmlhttp.status === 403) {
                console.log("JSCallback Error: Invalid token.  Stopping callbacks.");
            }

            // If server is stopping
            else if (xmlhttp.status === 503) {
                console.log("JSCallback Error: Service unavailable.  Stopping callbacks.");
            }

            // If request wasn't GET
            else if (xmlhttp.status === 400) {
                console.log("JSCallback Error: Bad request.  Stopping callbacks.");
            }

            // If error, revert to polling
            else {
                console.log("JSCallback Error: Request failed.");
                PhoneGap.UsePolling = true;
                PhoneGap.JSCallbackPolling();
            }
        }
    };

    if (PhoneGap.JSCallbackPort === null) {
        PhoneGap.JSCallbackPort = prompt("getPort", "gap_callbackServer:");
    }
    if (PhoneGap.JSCallbackToken === null) {
        PhoneGap.JSCallbackToken = prompt("getToken", "gap_callbackServer:");
    }
    xmlhttp.open("GET", "http://127.0.0.1:"+PhoneGap.JSCallbackPort+"/"+PhoneGap.JSCallbackToken , true);
    xmlhttp.send();
};

/**
 * The polling period to use with JSCallbackPolling.
 * This can be changed by the application.  The default is 50ms.
 */
PhoneGap.JSCallbackPollingPeriod = 50;

/**
 * Flag that can be set by the user to force polling to be used or force XHR to be used.
 */
PhoneGap.UsePolling = false;    // T=use polling, F=use XHR

/**
 * This is only for Android.
 *
 * Internal function that uses polling to call into PhoneGap Java code and retrieve
 * any JavaScript code that needs to be run.  This is used for callbacks from
 * Java to JavaScript.
 */
PhoneGap.JSCallbackPolling = function() {

    // Exit if shutting down app
    if (PhoneGap.shuttingDown) {
        return;
    }

    // If polling flag was changed, stop using polling from now on
    if (!PhoneGap.UsePolling) {
        PhoneGap.JSCallback();
        return;
    }

    var msg = prompt("", "gap_poll:");
    if (msg) {
        setTimeout(function() {
            try {
                var t = eval(""+msg);
            }
            catch (e) {
                console.log("JSCallbackPolling: Message from Server: " + msg);
                console.log("JSCallbackPolling Error: "+e);
            }
        }, 1);
        setTimeout(PhoneGap.JSCallbackPolling, 1);
    }
    else {
        setTimeout(PhoneGap.JSCallbackPolling, PhoneGap.JSCallbackPollingPeriod);
    }
};

/**
 * Create a UUID
 *
 * @return {String}
 */
PhoneGap.createUUID = function() {
    return PhoneGap.UUIDcreatePart(4) + '-' +
        PhoneGap.UUIDcreatePart(2) + '-' +
        PhoneGap.UUIDcreatePart(2) + '-' +
        PhoneGap.UUIDcreatePart(2) + '-' +
        PhoneGap.UUIDcreatePart(6);
};

PhoneGap.UUIDcreatePart = function(length) {
    var uuidpart = "";
    var i, uuidchar;
    for (i=0; i<length; i++) {
        uuidchar = parseInt((Math.random() * 256),0).toString(16);
        if (uuidchar.length === 1) {
            uuidchar = "0" + uuidchar;
        }
        uuidpart += uuidchar;
    }
    return uuidpart;
};

PhoneGap.close = function(context, func, params) {
    if (typeof params === 'undefined') {
        return function() {
            return func.apply(context, arguments);
        };
    } else {
        return function() {
            return func.apply(context, params);
        };
    }
};

/**
 * Load a JavaScript file after page has loaded.
 *
 * @param {String} jsfile               The url of the JavaScript file to load.
 * @param {Function} successCallback    The callback to call when the file has been loaded.
 */
PhoneGap.includeJavascript = function(jsfile, successCallback) {
    var id = document.getElementsByTagName("head")[0];
    var el = document.createElement('script');
    el.type = 'text/javascript';
    if (typeof successCallback === 'function') {
        el.onload = successCallback;
    }
    el.src = jsfile;
    id.appendChild(el);
};

}
/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("accelerometer")) {
PhoneGap.addResource("accelerometer");

/** @constructor */
var Acceleration = function(x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.timestamp = new Date().getTime();
};

/**
 * This class provides access to device accelerometer data.
 * @constructor
 */
var Accelerometer = function() {

    /**
     * The last known acceleration.  type=Acceleration()
     */
    this.lastAcceleration = null;

    /**
     * List of accelerometer watch timers
     */
    this.timers = {};
};

Accelerometer.ERROR_MSG = ["Not running", "Starting", "", "Failed to start"];

/**
 * Asynchronously aquires the current acceleration.
 *
 * @param {Function} successCallback    The function to call when the acceleration data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
 * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
 */
Accelerometer.prototype.getCurrentAcceleration = function(successCallback, errorCallback, options) {

    // successCallback required
    if (typeof successCallback !== "function") {
        console.log("Accelerometer Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Accelerometer Error: errorCallback is not a function");
        return;
    }

    // Get acceleration
    PhoneGap.exec(successCallback, errorCallback, "Accelerometer", "getAcceleration", []);
};

/**
 * Asynchronously aquires the acceleration repeatedly at a given interval.
 *
 * @param {Function} successCallback    The function to call each time the acceleration data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the acceleration data. (OPTIONAL)
 * @param {AccelerationOptions} options The options for getting the accelerometer data such as timeout. (OPTIONAL)
 * @return String                       The watch id that must be passed to #clearWatch to stop watching.
 */
Accelerometer.prototype.watchAcceleration = function(successCallback, errorCallback, options) {

    // Default interval (10 sec)
    var frequency = (options !== undefined)? options.frequency : 10000;

    // successCallback required
    if (typeof successCallback !== "function") {
        console.log("Accelerometer Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Accelerometer Error: errorCallback is not a function");
        return;
    }

    // Make sure accelerometer timeout > frequency + 10 sec
    PhoneGap.exec(
        function(timeout) {
            if (timeout < (frequency + 10000)) {
                PhoneGap.exec(null, null, "Accelerometer", "setTimeout", [frequency + 10000]);
            }
        },
        function(e) { }, "Accelerometer", "getTimeout", []);

    // Start watch timer
    var id = PhoneGap.createUUID();
    navigator.accelerometer.timers[id] = setInterval(function() {
        PhoneGap.exec(successCallback, errorCallback, "Accelerometer", "getAcceleration", []);
    }, (frequency ? frequency : 1));

    return id;
};

/**
 * Clears the specified accelerometer watch.
 *
 * @param {String} id       The id of the watch returned from #watchAcceleration.
 */
Accelerometer.prototype.clearWatch = function(id) {

    // Stop javascript timer & remove from timer list
    if (id && navigator.accelerometer.timers[id] !== undefined) {
        clearInterval(navigator.accelerometer.timers[id]);
        delete navigator.accelerometer.timers[id];
    }
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.accelerometer === "undefined") {
        navigator.accelerometer = new Accelerometer();
    }
});
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("app")) {
PhoneGap.addResource("app");
(function() {

/**
 * Constructor
 * @constructor
 */
var App = function() {};

/**
 * Clear the resource cache.
 */
App.prototype.clearCache = function() {
    PhoneGap.exec(null, null, "App", "clearCache", []);
};

/**
 * Load the url into the webview.
 *
 * @param url           The URL to load
 * @param props         Properties that can be passed in to the activity:
 *      wait: int                           => wait msec before loading URL
 *      loadingDialog: "Title,Message"      => display a native loading dialog
 *      hideLoadingDialogOnPage: boolean    => hide loadingDialog when page loaded instead of when deviceready event occurs.
 *      loadInWebView: boolean              => cause all links on web page to be loaded into existing web view, instead of being loaded into new browser.
 *      loadUrlTimeoutValue: int            => time in msec to wait before triggering a timeout error
 *      errorUrl: URL                       => URL to load if there's an error loading specified URL with loadUrl().  Should be a local URL such as file:///android_asset/www/error.html");
 *      keepRunning: boolean                => enable app to keep running in background
 *
 * Example:
 *      App app = new App();
 *      app.loadUrl("http://server/myapp/index.html", {wait:2000, loadingDialog:"Wait,Loading App", loadUrlTimeoutValue: 60000});
 */
App.prototype.loadUrl = function(url, props) {
    PhoneGap.exec(null, null, "App", "loadUrl", [url, props]);
};

/**
 * Cancel loadUrl that is waiting to be loaded.
 */
App.prototype.cancelLoadUrl = function() {
    PhoneGap.exec(null, null, "App", "cancelLoadUrl", []);
};

/**
 * Clear web history in this web view.
 * Instead of BACK button loading the previous web page, it will exit the app.
 */
App.prototype.clearHistory = function() {
    PhoneGap.exec(null, null, "App", "clearHistory", []);
};

/**
 * Override the default behavior of the Android back button.
 * If overridden, when the back button is pressed, the "backKeyDown" JavaScript event will be fired.
 *
 * Note: The user should not have to call this method.  Instead, when the user
 *       registers for the "backbutton" event, this is automatically done.
 *
 * @param override		T=override, F=cancel override
 */
App.prototype.overrideBackbutton = function(override) {
    PhoneGap.exec(null, null, "App", "overrideBackbutton", [override]);
};

/**
 * Exit and terminate the application.
 */
App.prototype.exitApp = function() {
	return PhoneGap.exec(null, null, "App", "exitApp", []);
};

PhoneGap.addConstructor(function() {
    navigator.app = new App();
});
}());
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("camera")) {
PhoneGap.addResource("camera");

/**
 * This class provides access to the device camera.
 *
 * @constructor
 */
var Camera = function() {
    this.successCallback = null;
    this.errorCallback = null;
    this.options = null;
};

/**
 * Format of image that returned from getPicture.
 *
 * Example: navigator.camera.getPicture(success, fail,
 *              { quality: 80,
 *                destinationType: Camera.DestinationType.DATA_URL,
 *                sourceType: Camera.PictureSourceType.PHOTOLIBRARY})
 */
Camera.DestinationType = {
    DATA_URL: 0,                // Return base64 encoded string
    FILE_URI: 1                 // Return file uri (content://media/external/images/media/2 for Android)
};
Camera.prototype.DestinationType = Camera.DestinationType;

/**
 * Encoding of image returned from getPicture.
 *
 * Example: navigator.camera.getPicture(success, fail,
 *              { quality: 80,
 *                destinationType: Camera.DestinationType.DATA_URL,
 *                sourceType: Camera.PictureSourceType.CAMERA,
 *                encodingType: Camera.EncodingType.PNG})
*/
Camera.EncodingType = {
    JPEG: 0,                    // Return JPEG encoded image
    PNG: 1                      // Return PNG encoded image
};
Camera.prototype.EncodingType = Camera.EncodingType;

/**
 * Source to getPicture from.
 *
 * Example: navigator.camera.getPicture(success, fail,
 *              { quality: 80,
 *                destinationType: Camera.DestinationType.DATA_URL,
 *                sourceType: Camera.PictureSourceType.PHOTOLIBRARY})
 */
Camera.PictureSourceType = {
    PHOTOLIBRARY : 0,           // Choose image from picture library (same as SAVEDPHOTOALBUM for Android)
    CAMERA : 1,                 // Take picture from camera
    SAVEDPHOTOALBUM : 2         // Choose image from picture library (same as PHOTOLIBRARY for Android)
};
Camera.prototype.PictureSourceType = Camera.PictureSourceType;

/**
 * Gets a picture from source defined by "options.sourceType", and returns the
 * image as defined by the "options.destinationType" option.

 * The defaults are sourceType=CAMERA and destinationType=DATA_URL.
 *
 * @param {Function} successCallback
 * @param {Function} errorCallback
 * @param {Object} options
 */
Camera.prototype.getPicture = function(successCallback, errorCallback, options) {

    // successCallback required
    if (typeof successCallback !== "function") {
        console.log("Camera Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Camera Error: errorCallback is not a function");
        return;
    }

    this.options = options;
    var quality = 80;
    if (options.quality) {
        quality = this.options.quality;
    }
    
    var maxResolution = 0;
    if (options.maxResolution) {
    	maxResolution = this.options.maxResolution;
    }
    
    var destinationType = Camera.DestinationType.DATA_URL;
    if (this.options.destinationType) {
        destinationType = this.options.destinationType;
    }
    var sourceType = Camera.PictureSourceType.CAMERA;
    if (typeof this.options.sourceType === "number") {
        sourceType = this.options.sourceType;
    }
    var encodingType = Camera.EncodingType.JPEG;
    if (typeof options.encodingType == "number") {
        encodingType = this.options.encodingType;
    }
    
    var targetWidth = -1;
    if (typeof options.targetWidth == "number") {
        targetWidth = options.targetWidth;
    } else if (typeof options.targetWidth == "string") {
        var width = new Number(options.targetWidth);
        if (isNaN(width) === false) {
            targetWidth = width.valueOf();
        }
    }

    var targetHeight = -1;
    if (typeof options.targetHeight == "number") {
        targetHeight = options.targetHeight;
    } else if (typeof options.targetHeight == "string") {
        var height = new Number(options.targetHeight);
        if (isNaN(height) === false) {
            targetHeight = height.valueOf();
        }
    }
    
    PhoneGap.exec(successCallback, errorCallback, "Camera", "takePicture", [quality, destinationType, sourceType, targetWidth, targetHeight, encodingType]);
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.camera === "undefined") {
        navigator.camera = new Camera();
    }
});
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("capture")) {
PhoneGap.addResource("capture");
	
/**
 * Represents a single file.
 *
 * name {DOMString} name of the file, without path information
 * fullPath {DOMString} the full path of the file, including the name
 * type {DOMString} mime type
 * lastModifiedDate {Date} last modified date
 * size {Number} size of the file in bytes
 */
var MediaFile = function(name, fullPath, type, lastModifiedDate, size){
	this.name = name || null;
	this.fullPath = fullPath || null;
	this.type = type || null;
	this.lastModifiedDate = lastModifiedDate || null;
	this.size = size || 0;
};

/**
 * Launch device camera application for recording video(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 */
MediaFile.prototype.getFormatData = function(successCallback, errorCallback){
	PhoneGap.exec(successCallback, errorCallback, "Capture", "getFormatData", [this.fullPath, this.type]);
};

/**
 * MediaFileData encapsulates format information of a media file.
 *
 * @param {DOMString} codecs
 * @param {long} bitrate
 * @param {long} height
 * @param {long} width
 * @param {float} duration
 */
var MediaFileData = function(codecs, bitrate, height, width, duration){
	this.codecs = codecs || null;
	this.bitrate = bitrate || 0;
	this.height = height || 0;
	this.width = width || 0;
	this.duration = duration || 0;
};

/**
 * The CaptureError interface encapsulates all errors in the Capture API.
 */
var CaptureError = function(){
	this.code = null;
};

// Capture error codes
CaptureError.CAPTURE_INTERNAL_ERR = 0;
CaptureError.CAPTURE_APPLICATION_BUSY = 1;
CaptureError.CAPTURE_INVALID_ARGUMENT = 2;
CaptureError.CAPTURE_NO_MEDIA_FILES = 3;
CaptureError.CAPTURE_NOT_SUPPORTED = 20;

/**
 * The Capture interface exposes an interface to the camera and microphone of the hosting device.
 */
var Capture = function(){
	this.supportedAudioModes = [];
	this.supportedImageModes = [];
	this.supportedVideoModes = [];
};

/**
 * Launch audio recorder application for recording audio clip(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureAudioOptions} options
 */
Capture.prototype.captureAudio = function(successCallback, errorCallback, options){
	PhoneGap.exec(successCallback, errorCallback, "Capture", "captureAudio", [options]);
};

/**
 * Launch camera application for taking image(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureImageOptions} options
 */
Capture.prototype.captureImage = function(successCallback, errorCallback, options){
	PhoneGap.exec(successCallback, errorCallback, "Capture", "captureImage", [options]);
};

/**
 * Launch camera application for taking image(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureImageOptions} options
 */
Capture.prototype._castMediaFile = function(pluginResult){
	var mediaFiles = [];
	var i;
	for (i = 0; i < pluginResult.message.length; i++) {
		var mediaFile = new MediaFile();
		mediaFile.name = pluginResult.message[i].name;
		mediaFile.fullPath = pluginResult.message[i].fullPath;
		mediaFile.type = pluginResult.message[i].type;
		mediaFile.lastModifiedDate = pluginResult.message[i].lastModifiedDate;
		mediaFile.size = pluginResult.message[i].size;
		mediaFiles.push(mediaFile);
	}
	pluginResult.message = mediaFiles;
	return pluginResult;
};

/**
 * Launch device camera application for recording video(s).
 *
 * @param {Function} successCB
 * @param {Function} errorCB
 * @param {CaptureVideoOptions} options
 */
Capture.prototype.captureVideo = function(successCallback, errorCallback, options){
	PhoneGap.exec(successCallback, errorCallback, "Capture", "captureVideo", [options]);
};

/**
 * Encapsulates a set of parameters that the capture device supports.
 */
var ConfigurationData = function(){
	// The ASCII-encoded string in lower case representing the media type. 
	this.type = null;
	// The height attribute represents height of the image or video in pixels. 
	// In the case of a sound clip this attribute has value 0. 
	this.height = 0;
	// The width attribute represents width of the image or video in pixels. 
	// In the case of a sound clip this attribute has value 0
	this.width = 0;
};

/**
 * Encapsulates all image capture operation configuration options.
 */
var CaptureImageOptions = function(){
	// Upper limit of images user can take. Value must be equal or greater than 1.
	this.limit = 1;
	// The selected image mode. Must match with one of the elements in supportedImageModes array.
	this.mode = null;
};

/**
 * Encapsulates all video capture operation configuration options.
 */
var CaptureVideoOptions = function(){
	// Upper limit of videos user can record. Value must be equal or greater than 1.
	this.limit = 1;
	// Maximum duration of a single video clip in seconds.
	this.duration = 0;
	// The selected video mode. Must match with one of the elements in supportedVideoModes array.
	this.mode = null;
};

/**
 * Encapsulates all audio capture operation configuration options.
 */
var CaptureAudioOptions = function(){
	// Upper limit of sound clips user can record. Value must be equal or greater than 1.
	this.limit = 1;
	// Maximum duration of a single sound clip in seconds.
	this.duration = 0;
	// The selected audio mode. Must match with one of the elements in supportedAudioModes array.
	this.mode = null;
};

PhoneGap.addConstructor(function(){
	if (typeof navigator.device === "undefined") {
		navigator.device = window.device = new Device();
	}
	if (typeof navigator.device.capture === "undefined") {
		navigator.device.capture = window.device.capture = new Capture();
	}
});
}

/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("compass")) {
PhoneGap.addResource("compass");

/**
 * This class provides access to device Compass data.
 * @constructor
 */
var Compass = function() {
    /**
     * The last known Compass position.
     */
    this.lastHeading = null;

    /**
     * List of compass watch timers
     */
    this.timers = {};
};

Compass.ERROR_MSG = ["Not running", "Starting", "", "Failed to start"];

/**
 * Asynchronously aquires the current heading.
 *
 * @param {Function} successCallback The function to call when the heading data is available
 * @param {Function} errorCallback The function to call when there is an error getting the heading data. (OPTIONAL)
 * @param {PositionOptions} options The options for getting the heading data such as timeout. (OPTIONAL)
 */
Compass.prototype.getCurrentHeading = function(successCallback, errorCallback, options) {

    // successCallback required
    if (typeof successCallback !== "function") {
        console.log("Compass Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Compass Error: errorCallback is not a function");
        return;
    }

    // Get heading
    PhoneGap.exec(successCallback, errorCallback, "Compass", "getHeading", []);
};

/**
 * Asynchronously aquires the heading repeatedly at a given interval.
 *
 * @param {Function} successCallback    The function to call each time the heading data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the heading data. (OPTIONAL)
 * @param {HeadingOptions} options      The options for getting the heading data such as timeout and the frequency of the watch. (OPTIONAL)
 * @return String                       The watch id that must be passed to #clearWatch to stop watching.
 */
Compass.prototype.watchHeading= function(successCallback, errorCallback, options) {

    // Default interval (100 msec)
    var frequency = (options !== undefined) ? options.frequency : 100;

    // successCallback required
    if (typeof successCallback !== "function") {
        console.log("Compass Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Compass Error: errorCallback is not a function");
        return;
    }

    // Make sure compass timeout > frequency + 10 sec
    PhoneGap.exec(
        function(timeout) {
            if (timeout < (frequency + 10000)) {
                PhoneGap.exec(null, null, "Compass", "setTimeout", [frequency + 10000]);
            }
        },
        function(e) { }, "Compass", "getTimeout", []);

    // Start watch timer to get headings
    var id = PhoneGap.createUUID();
    navigator.compass.timers[id] = setInterval(
        function() {
            PhoneGap.exec(successCallback, errorCallback, "Compass", "getHeading", []);
        }, (frequency ? frequency : 1));

    return id;
};


/**
 * Clears the specified heading watch.
 *
 * @param {String} id       The ID of the watch returned from #watchHeading.
 */
Compass.prototype.clearWatch = function(id) {

    // Stop javascript timer & remove from timer list
    if (id && navigator.compass.timers[id]) {
        clearInterval(navigator.compass.timers[id]);
        delete navigator.compass.timers[id];
    }
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.compass === "undefined") {
        navigator.compass = new Compass();
    }
});
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("contact")) {
PhoneGap.addResource("contact");

/**
* Contains information about a single contact.
* @constructor
* @param {DOMString} id unique identifier
* @param {DOMString} displayName
* @param {ContactName} name
* @param {DOMString} nickname
* @param {Array.<ContactField>} phoneNumbers array of phone numbers
* @param {Array.<ContactField>} emails array of email addresses
* @param {Array.<ContactAddress>} addresses array of addresses
* @param {Array.<ContactField>} ims instant messaging user ids
* @param {Array.<ContactOrganization>} organizations
* @param {DOMString} birthday contact's birthday
* @param {DOMString} note user notes about contact
* @param {Array.<ContactField>} photos
* @param {Array.<ContactField>} categories
* @param {Array.<ContactField>} urls contact's web sites
*/
var Contact = function (id, displayName, name, nickname, phoneNumbers, emails, addresses,
    ims, organizations, birthday, note, photos, categories, urls) {
    this.id = id || null;
    this.rawId = null;
    this.displayName = displayName || null;
    this.name = name || null; // ContactName
    this.nickname = nickname || null;
    this.phoneNumbers = phoneNumbers || null; // ContactField[]
    this.emails = emails || null; // ContactField[]
    this.addresses = addresses || null; // ContactAddress[]
    this.ims = ims || null; // ContactField[]
    this.organizations = organizations || null; // ContactOrganization[]
    this.birthday = birthday || null;
    this.note = note || null;
    this.photos = photos || null; // ContactField[]
    this.categories = categories || null; // ContactField[]
    this.urls = urls || null; // ContactField[]
};

/**
 *  ContactError.
 *  An error code assigned by an implementation when an error has occurreds
 * @constructor
 */
var ContactError = function() {
    this.code=null;
};

/**
 * Error codes
 */
ContactError.UNKNOWN_ERROR = 0;
ContactError.INVALID_ARGUMENT_ERROR = 1;
ContactError.TIMEOUT_ERROR = 2;
ContactError.PENDING_OPERATION_ERROR = 3;
ContactError.IO_ERROR = 4;
ContactError.NOT_SUPPORTED_ERROR = 5;
ContactError.PERMISSION_DENIED_ERROR = 20;

/**
* Removes contact from device storage.
* @param successCB success callback
* @param errorCB error callback
*/
Contact.prototype.remove = function(successCB, errorCB) {
    if (this.id === null) {
        var errorObj = new ContactError();
        errorObj.code = ContactError.UNKNOWN_ERROR;
        errorCB(errorObj);
    }
    else {
        PhoneGap.exec(successCB, errorCB, "Contacts", "remove", [this.id]);
    }
};

/**
* Creates a deep copy of this Contact.
* With the contact ID set to null.
* @return copy of this Contact
*/
Contact.prototype.clone = function() {
    var clonedContact = PhoneGap.clone(this);
    var i;
    clonedContact.id = null;
    clonedContact.rawId = null;
    // Loop through and clear out any id's in phones, emails, etc.
    if (clonedContact.phoneNumbers) {
        for (i = 0; i < clonedContact.phoneNumbers.length; i++) {
            clonedContact.phoneNumbers[i].id = null;
        }
    }
    if (clonedContact.emails) {
        for (i = 0; i < clonedContact.emails.length; i++) {
            clonedContact.emails[i].id = null;
        }
    }
    if (clonedContact.addresses) {
        for (i = 0; i < clonedContact.addresses.length; i++) {
            clonedContact.addresses[i].id = null;
        }
    }
    if (clonedContact.ims) {
        for (i = 0; i < clonedContact.ims.length; i++) {
            clonedContact.ims[i].id = null;
        }
    }
    if (clonedContact.organizations) {
        for (i = 0; i < clonedContact.organizations.length; i++) {
            clonedContact.organizations[i].id = null;
        }
    }
    if (clonedContact.tags) {
        for (i = 0; i < clonedContact.tags.length; i++) {
            clonedContact.tags[i].id = null;
        }
    }
    if (clonedContact.photos) {
        for (i = 0; i < clonedContact.photos.length; i++) {
            clonedContact.photos[i].id = null;
        }
    }
    if (clonedContact.urls) {
        for (i = 0; i < clonedContact.urls.length; i++) {
            clonedContact.urls[i].id = null;
        }
    }
    return clonedContact;
};

/**
* Persists contact to device storage.
* @param successCB success callback
* @param errorCB error callback
*/
Contact.prototype.save = function(successCB, errorCB) {
    PhoneGap.exec(successCB, errorCB, "Contacts", "save", [this]);
};

/**
* Contact name.
* @constructor
* @param formatted
* @param familyName
* @param givenName
* @param middle
* @param prefix
* @param suffix
*/
var ContactName = function(formatted, familyName, givenName, middle, prefix, suffix) {
    this.formatted = formatted || null;
    this.familyName = familyName || null;
    this.givenName = givenName || null;
    this.middleName = middle || null;
    this.honorificPrefix = prefix || null;
    this.honorificSuffix = suffix || null;
};

/**
* Generic contact field.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code
* @param type
* @param value
* @param pref
*/
var ContactField = function(type, value, pref) {
	this.id = null;
    this.type = type || null;
    this.value = value || null;
    this.pref = pref || null;
};

/**
* Contact address.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code
* @param formatted
* @param streetAddress
* @param locality
* @param region
* @param postalCode
* @param country
*/
var ContactAddress = function(pref, type, formatted, streetAddress, locality, region, postalCode, country) {
	this.id = null;
    this.pref = pref || null;
    this.type = type || null;
    this.formatted = formatted || null;
    this.streetAddress = streetAddress || null;
    this.locality = locality || null;
    this.region = region || null;
    this.postalCode = postalCode || null;
    this.country = country || null;
};

/**
* Contact organization.
* @constructor
* @param {DOMString} id unique identifier, should only be set by native code
* @param name
* @param dept
* @param title
* @param startDate
* @param endDate
* @param location
* @param desc
*/
var ContactOrganization = function(pref, type, name, dept, title) {
	this.id = null;
    this.pref = pref || null;
    this.type = type || null;
    this.name = name || null;
    this.department = dept || null;
    this.title = title || null;
};

/**
* Represents a group of Contacts.
* @constructor
*/
var Contacts = function() {
    this.inProgress = false;
    this.records = [];
};
/**
* Returns an array of Contacts matching the search criteria.
* @param fields that should be searched
* @param successCB success callback
* @param errorCB error callback
* @param {ContactFindOptions} options that can be applied to contact searching
* @return array of Contacts matching search criteria
*/
Contacts.prototype.find = function(fields, successCB, errorCB, options) {
    if (successCB === null) {
        throw new TypeError("You must specify a success callback for the find command.");
    }
    if (fields === null || fields === "undefined" || fields.length === "undefined" || fields.length <= 0) {
        if (typeof errorCB === "function") {
            errorCB({"code": ContactError.INVALID_ARGUMENT_ERROR});
        }
    } else {
        PhoneGap.exec(successCB, errorCB, "Contacts", "search", [fields, options]);        
    }
};

/**
* This function creates a new contact, but it does not persist the contact
* to device storage. To persist the contact to device storage, invoke
* contact.save().
* @param properties an object who's properties will be examined to create a new Contact
* @returns new Contact object
*/
Contacts.prototype.create = function(properties) {
    var i;
	var contact = new Contact();
    for (i in properties) {
        if (contact[i] !== 'undefined') {
            contact[i] = properties[i];
        }
    }
    return contact;
};

/**
* This function returns and array of contacts.  It is required as we need to convert raw
* JSON objects into concrete Contact objects.  Currently this method is called after
* navigator.contacts.find but before the find methods success call back.
*
* @param jsonArray an array of JSON Objects that need to be converted to Contact objects.
* @returns an array of Contact objects
*/
Contacts.prototype.cast = function(pluginResult) {
	var contacts = [];
	var i;
	for (i=0; i<pluginResult.message.length; i++) {
		contacts.push(navigator.contacts.create(pluginResult.message[i]));
	}
	pluginResult.message = contacts;
	return pluginResult;
};

/**
 * ContactFindOptions.
 * @constructor
 * @param filter used to match contacts against
 * @param multiple boolean used to determine if more than one contact should be returned
 */
var ContactFindOptions = function(filter, multiple) {
    this.filter = filter || '';
    this.multiple = multiple || false;
};

/**
 * Add the contact interface into the browser.
 */
PhoneGap.addConstructor(function() {
    if(typeof navigator.contacts === "undefined") {
        navigator.contacts = new Contacts();
    }
});
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

// TODO: Needs to be commented

if (!PhoneGap.hasResource("crypto")) {
PhoneGap.addResource("crypto");

/**
* @constructor
*/
var Crypto = function() {
};

Crypto.prototype.encrypt = function(seed, string, callback) {
    this.encryptWin = callback;
    PhoneGap.exec(null, null, "Crypto", "encrypt", [seed, string]);
};

Crypto.prototype.decrypt = function(seed, string, callback) {
    this.decryptWin = callback;
    PhoneGap.exec(null, null, "Crypto", "decrypt", [seed, string]);
};

Crypto.prototype.gotCryptedString = function(string) {
    this.encryptWin(string);
};

Crypto.prototype.getPlainString = function(string) {
    this.decryptWin(string);
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.Crypto === "undefined") {
        navigator.Crypto = new Crypto();
    }
});
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("device")) {
PhoneGap.addResource("device");

/**
 * This represents the mobile device, and provides properties for inspecting the model, version, UUID of the
 * phone, etc.
 * @constructor
 */
var Device = function() {
    this.available = PhoneGap.available;
    this.platform = null;
    this.version = null;
    this.name = null;
    this.uuid = null;
    this.phonegap = null;

    var me = this;
    this.getInfo(
        function(info) {
            me.available = true;
            me.platform = info.platform;
            me.version = info.version;
            me.name = info.name;
            me.uuid = info.uuid;
            me.phonegap = info.phonegap;
            PhoneGap.onPhoneGapInfoReady.fire();
        },
        function(e) {
            me.available = false;
            console.log("Error initializing PhoneGap: " + e);
            alert("Error initializing PhoneGap: "+e);
        });
};

/**
 * Get device info
 *
 * @param {Function} successCallback The function to call when the heading data is available
 * @param {Function} errorCallback The function to call when there is an error getting the heading data. (OPTIONAL)
 */
Device.prototype.getInfo = function(successCallback, errorCallback) {

    // successCallback required
    if (typeof successCallback !== "function") {
        console.log("Device Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Device Error: errorCallback is not a function");
        return;
    }

    // Get info
    PhoneGap.exec(successCallback, errorCallback, "Device", "getDeviceInfo", []);
};

/*
 * DEPRECATED
 * This is only for Android.
 *
 * You must explicitly override the back button.
 */
Device.prototype.overrideBackButton = function() {
	console.log("Device.overrideBackButton() is deprecated.  Use App.overrideBackbutton(true).");
	navigator.app.overrideBackbutton(true);
};

/*
 * DEPRECATED
 * This is only for Android.
 *
 * This resets the back button to the default behaviour
 */
Device.prototype.resetBackButton = function() {
	console.log("Device.resetBackButton() is deprecated.  Use App.overrideBackbutton(false).");
	navigator.app.overrideBackbutton(false);
};

/*
 * DEPRECATED
 * This is only for Android.
 *
 * This terminates the activity!
 */
Device.prototype.exitApp = function() {
	console.log("Device.exitApp() is deprecated.  Use App.exitApp().");
	navigator.app.exitApp();
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.device === "undefined") {
        navigator.device = window.device = new Device();
    }
});
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("file")) {
PhoneGap.addResource("file");

/**
 * This class provides some useful information about a file.
 * This is the fields returned when navigator.fileMgr.getFileProperties()
 * is called.
 * @constructor
 */
var FileProperties = function(filePath) {
    this.filePath = filePath;
    this.size = 0;
    this.lastModifiedDate = null;
};

/**
 * Represents a single file.
 *
 * @constructor
 * @param name {DOMString} name of the file, without path information
 * @param fullPath {DOMString} the full path of the file, including the name
 * @param type {DOMString} mime type
 * @param lastModifiedDate {Date} last modified date
 * @param size {Number} size of the file in bytes
 */
var File = function(name, fullPath, type, lastModifiedDate, size) {
	this.name = name || null;
    this.fullPath = fullPath || null;
	this.type = type || null;
    this.lastModifiedDate = lastModifiedDate || null;
    this.size = size || 0;
};

/** @constructor */
var FileError = function() {
   this.code = null;
};

// File error codes
// Found in DOMException
FileError.NOT_FOUND_ERR = 1;
FileError.SECURITY_ERR = 2;
FileError.ABORT_ERR = 3;

// Added by this specification
FileError.NOT_READABLE_ERR = 4;
FileError.ENCODING_ERR = 5;
FileError.NO_MODIFICATION_ALLOWED_ERR = 6;
FileError.INVALID_STATE_ERR = 7;
FileError.SYNTAX_ERR = 8;
FileError.INVALID_MODIFICATION_ERR = 9;
FileError.QUOTA_EXCEEDED_ERR = 10;
FileError.TYPE_MISMATCH_ERR = 11;
FileError.PATH_EXISTS_ERR = 12;

//-----------------------------------------------------------------------------
// File manager
//-----------------------------------------------------------------------------

/** @constructor */
var FileMgr = function() {
};

FileMgr.prototype.getFileProperties = function(filePath) {
    return PhoneGap.exec(null, null, "File", "getFileProperties", [filePath]);
};

FileMgr.prototype.getFileBasePaths = function() {
};

FileMgr.prototype.testSaveLocationExists = function(successCallback, errorCallback) {
    return PhoneGap.exec(successCallback, errorCallback, "File", "testSaveLocationExists", []);
};

FileMgr.prototype.testFileExists = function(fileName, successCallback, errorCallback) {
    return PhoneGap.exec(successCallback, errorCallback, "File", "testFileExists", [fileName]);
};

FileMgr.prototype.testDirectoryExists = function(dirName, successCallback, errorCallback) {
    return PhoneGap.exec(successCallback, errorCallback, "File", "testDirectoryExists", [dirName]);
};

FileMgr.prototype.getFreeDiskSpace = function(successCallback, errorCallback) {
    return PhoneGap.exec(successCallback, errorCallback, "File", "getFreeDiskSpace", []);
};

FileMgr.prototype.write = function(fileName, data, position, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "write", [fileName, data, position]);
};

FileMgr.prototype.truncate = function(fileName, size, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "truncate", [fileName, size]);
};

FileMgr.prototype.readAsText = function(fileName, encoding, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "readAsText", [fileName, encoding]);
};

FileMgr.prototype.readAsDataURL = function(fileName, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "readAsDataURL", [fileName]);
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.fileMgr === "undefined") {
        navigator.fileMgr = new FileMgr();
    }
});

//-----------------------------------------------------------------------------
// File Reader
//-----------------------------------------------------------------------------
// TODO: All other FileMgr function operate on the SD card as root.  However,
//       for FileReader & FileWriter the root is not SD card.  Should this be changed?

/**
 * This class reads the mobile device file system.
 *
 * For Android:
 *      The root directory is the root of the file system.
 *      To read from the SD card, the file name is "sdcard/my_file.txt"
 * @constructor
 */
var FileReader = function() {
    this.fileName = "";

    this.readyState = 0;

    // File data
    this.result = null;

    // Error
    this.error = null;

    // Event handlers
    this.onloadstart = null;    // When the read starts.
    this.onprogress = null;     // While reading (and decoding) file or fileBlob data, and reporting partial file data (progess.loaded/progress.total)
    this.onload = null;         // When the read has successfully completed.
    this.onerror = null;        // When the read has failed (see errors).
    this.onloadend = null;      // When the request has completed (either in success or failure).
    this.onabort = null;        // When the read has been aborted. For instance, by invoking the abort() method.
};

// States
FileReader.EMPTY = 0;
FileReader.LOADING = 1;
FileReader.DONE = 2;

/**
 * Abort reading file.
 */
FileReader.prototype.abort = function() {
    var evt;
    this.readyState = FileReader.DONE;
    this.result = null;

    // set error
    var error = new FileError();
    error.code = error.ABORT_ERR;
    this.error = error;

    // If error callback
    if (typeof this.onerror === "function") {
        this.onerror({"type":"error", "target":this});
    }
    // If abort callback
    if (typeof this.onabort === "function") {
        this.onabort({"type":"abort", "target":this});
    }
    // If load end callback
    if (typeof this.onloadend === "function") {
        this.onloadend({"type":"loadend", "target":this});
    }
};

/**
 * Read text file.
 *
 * @param file          {File} File object containing file properties
 * @param encoding      [Optional] (see http://www.iana.org/assignments/character-sets)
 */
FileReader.prototype.readAsText = function(file, encoding) {
    this.fileName = "";
	if (typeof file.fullPath === "undefined") {
		this.fileName = file;
	} else {
		this.fileName = file.fullPath;
	}

    // LOADING state
    this.readyState = FileReader.LOADING;

    // If loadstart callback
    if (typeof this.onloadstart === "function") {
        this.onloadstart({"type":"loadstart", "target":this});
    }

    // Default encoding is UTF-8
    var enc = encoding ? encoding : "UTF-8";

    var me = this;

    // Read file
    navigator.fileMgr.readAsText(this.fileName, enc,

        // Success callback
        function(r) {
            var evt;

            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileReader.DONE) {
                return;
            }

            // Save result
            me.result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload({"type":"load", "target":me});
            }

            // DONE state
            me.readyState = FileReader.DONE;

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend({"type":"loadend", "target":me});
            }
        },

        // Error callback
        function(e) {
            var evt;
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileReader.DONE) {
                return;
            }

            // Save error
		    me.error = e;

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror({"type":"error", "target":me});
            }

            // DONE state
            me.readyState = FileReader.DONE;

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend({"type":"loadend", "target":me});
            }
        }
        );
};


/**
 * Read file and return data as a base64 encoded data url.
 * A data url is of the form:
 *      data:[<mediatype>][;base64],<data>
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsDataURL = function(file) {
	this.fileName = "";
    if (typeof file.fullPath === "undefined") {
        this.fileName = file;
    } else {
        this.fileName = file.fullPath;
    }

    // LOADING state
    this.readyState = FileReader.LOADING;

    // If loadstart callback
    if (typeof this.onloadstart === "function") {
        this.onloadstart({"type":"loadstart", "target":this});
    }

    var me = this;

    // Read file
    navigator.fileMgr.readAsDataURL(this.fileName,

        // Success callback
        function(r) {
            var evt;

            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileReader.DONE) {
                return;
            }

            // Save result
            me.result = r;

            // If onload callback
            if (typeof me.onload === "function") {
                me.onload({"type":"load", "target":me});
            }

            // DONE state
            me.readyState = FileReader.DONE;

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend({"type":"loadend", "target":me});
            }
        },

        // Error callback
        function(e) {
            var evt;
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileReader.DONE) {
                return;
            }

            // Save error
            me.error = e;

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror({"type":"error", "target":me});
            }

            // DONE state
            me.readyState = FileReader.DONE;

            // If onloadend callback
            if (typeof me.onloadend === "function") {
                me.onloadend({"type":"loadend", "target":me});
            }
        }
        );
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsBinaryString = function(file) {
    // TODO - Can't return binary data to browser.
    this.fileName = file;
};

/**
 * Read file and return data as a binary data.
 *
 * @param file          {File} File object containing file properties
 */
FileReader.prototype.readAsArrayBuffer = function(file) {
    // TODO - Can't return binary data to browser.
    this.fileName = file;
};

//-----------------------------------------------------------------------------
// File Writer
//-----------------------------------------------------------------------------

/**
 * This class writes to the mobile device file system.
 *
 * For Android:
 *      The root directory is the root of the file system.
 *      To write to the SD card, the file name is "sdcard/my_file.txt"
 *
 * @constructor
 * @param file {File} File object containing file properties
 * @param append if true write to the end of the file, otherwise overwrite the file
 */
var FileWriter = function(file) {
    this.fileName = "";
    this.length = 0;
	if (file) {
	    this.fileName = file.fullPath || file;
	    this.length = file.size || 0;
	}
    // default is to write at the beginning of the file
    this.position = 0;

    this.readyState = 0; // EMPTY

    this.result = null;

    // Error
    this.error = null;

    // Event handlers
    this.onwritestart = null;	// When writing starts
    this.onprogress = null;		// While writing the file, and reporting partial file data
    this.onwrite = null;		// When the write has successfully completed.
    this.onwriteend = null;		// When the request has completed (either in success or failure).
    this.onabort = null;		// When the write has been aborted. For instance, by invoking the abort() method.
    this.onerror = null;		// When the write has failed (see errors).
};

// States
FileWriter.INIT = 0;
FileWriter.WRITING = 1;
FileWriter.DONE = 2;

/**
 * Abort writing file.
 */
FileWriter.prototype.abort = function() {
    // check for invalid state
	if (this.readyState === FileWriter.DONE || this.readyState === FileWriter.INIT) {
		throw FileError.INVALID_STATE_ERR;
	}

    // set error
    var error = new FileError(), evt;
    error.code = error.ABORT_ERR;
    this.error = error;

    // If error callback
    if (typeof this.onerror === "function") {
        this.onerror({"type":"error", "target":this});
    }
    // If abort callback
    if (typeof this.onabort === "function") {
        this.onabort({"type":"abort", "target":this});
    }

    this.readyState = FileWriter.DONE;

    // If write end callback
    if (typeof this.onwriteend == "function") {
        this.onwriteend({"type":"writeend", "target":this});
    }
};

/**
 * Writes data to the file
 *
 * @param text to be written
 */
FileWriter.prototype.write = function(text) {
	// Throw an exception if we are already writing a file
	if (this.readyState === FileWriter.WRITING) {
		throw FileError.INVALID_STATE_ERR;
	}

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart({"type":"writestart", "target":me});
    }

    // Write file
    navigator.fileMgr.write(this.fileName, text, this.position,

        // Success callback
        function(r) {
            var evt;
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // position always increases by bytes written because file would be extended
            me.position += r;
            // The length of the file is now where we are done writing.
            me.length = me.position;

            // If onwrite callback
            if (typeof me.onwrite === "function") {
                me.onwrite({"type":"write", "target":me});
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend({"type":"writeend", "target":me});
            }
        },

        // Error callback
        function(e) {
            var evt;

            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // Save error
            me.error = e;

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror({"type":"error", "target":me});
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend({"type":"writeend", "target":me});
            }
        }
        );

};

/**
 * Moves the file pointer to the location specified.
 *
 * If the offset is a negative number the position of the file
 * pointer is rewound.  If the offset is greater than the file
 * size the position is set to the end of the file.
 *
 * @param offset is the location to move the file pointer to.
 */
FileWriter.prototype.seek = function(offset) {
    // Throw an exception if we are already writing a file
    if (this.readyState === FileWriter.WRITING) {
        throw FileError.INVALID_STATE_ERR;
    }

    if (!offset) {
        return;
    }

    // See back from end of file.
    if (offset < 0) {
		this.position = Math.max(offset + this.length, 0);
	}
    // Offset is bigger then file size so set position
    // to the end of the file.
	else if (offset > this.length) {
		this.position = this.length;
	}
    // Offset is between 0 and file size so set the position
    // to start writing.
	else {
		this.position = offset;
	}
};

/**
 * Truncates the file to the size specified.
 *
 * @param size to chop the file at.
 */
FileWriter.prototype.truncate = function(size) {
	// Throw an exception if we are already writing a file
	if (this.readyState === FileWriter.WRITING) {
		throw FileError.INVALID_STATE_ERR;
	}

    // WRITING state
    this.readyState = FileWriter.WRITING;

    var me = this;

    // If onwritestart callback
    if (typeof me.onwritestart === "function") {
        me.onwritestart({"type":"writestart", "target":this});
    }

    // Write file
    navigator.fileMgr.truncate(this.fileName, size,

        // Success callback
        function(r) {
            var evt;
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // Update the length of the file
            me.length = r;
            me.position = Math.min(me.position, r);

            // If onwrite callback
            if (typeof me.onwrite === "function") {
                me.onwrite({"type":"write", "target":me});
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend({"type":"writeend", "target":me});
            }
        },

        // Error callback
        function(e) {
            var evt;
            // If DONE (cancelled), then don't do anything
            if (me.readyState === FileWriter.DONE) {
                return;
            }

            // Save error
            me.error = e;

            // If onerror callback
            if (typeof me.onerror === "function") {
                me.onerror({"type":"error", "target":me});
            }

            // DONE state
            me.readyState = FileWriter.DONE;

            // If onwriteend callback
            if (typeof me.onwriteend === "function") {
                me.onwriteend({"type":"writeend", "target":me});
            }
        }
    );
};

/**
 * Information about the state of the file or directory
 *
 * @constructor
 * {Date} modificationTime (readonly)
 */
var Metadata = function() {
    this.modificationTime=null;
};

/**
 * Supplies arguments to methods that lookup or create files and directories
 *
 * @constructor
 * @param {boolean} create file or directory if it doesn't exist
 * @param {boolean} exclusive if true the command will fail if the file or directory exists
 */
var Flags = function(create, exclusive) {
    this.create = create || false;
    this.exclusive = exclusive || false;
};

/**
 * An interface representing a file system
 *
 * @constructor
 * {DOMString} name the unique name of the file system (readonly)
 * {DirectoryEntry} root directory of the file system (readonly)
 */
var FileSystem = function() {
    this.name = null;
    this.root = null;
};

/**
 * An interface that lists the files and directories in a directory.
 * @constructor
 */
var DirectoryReader = function(fullPath){
    this.fullPath = fullPath || null;
};

/**
 * Returns a list of entries from a directory.
 *
 * @param {Function} successCallback is called with a list of entries
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryReader.prototype.readEntries = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "readEntries", [this.fullPath]);
};

/**
 * An interface representing a directory on the file system.
 *
 * @constructor
 * {boolean} isFile always false (readonly)
 * {boolean} isDirectory always true (readonly)
 * {DOMString} name of the directory, excluding the path leading to it (readonly)
 * {DOMString} fullPath the absolute full path to the directory (readonly)
 * {FileSystem} filesystem on which the directory resides (readonly)
 */
var DirectoryEntry = function() {
    this.isFile = false;
    this.isDirectory = true;
    this.name = null;
    this.fullPath = null;
    this.filesystem = null;
};

/**
 * Copies a directory to a new location
 *
 * @param {DirectoryEntry} parent the directory to which to copy the entry
 * @param {DOMString} newName the new name of the entry, defaults to the current name
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.copyTo = function(parent, newName, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "copyTo", [this.fullPath, parent, newName]);
};

/**
 * Looks up the metadata of the entry
 *
 * @param {Function} successCallback is called with a Metadata object
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getMetadata = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getMetadata", [this.fullPath]);
};

/**
 * Gets the parent of the entry
 *
 * @param {Function} successCallback is called with a parent entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getParent = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getParent", [this.fullPath]);
};

/**
 * Moves a directory to a new location
 *
 * @param {DirectoryEntry} parent the directory to which to move the entry
 * @param {DOMString} newName the new name of the entry, defaults to the current name
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.moveTo = function(parent, newName, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "moveTo", [this.fullPath, parent, newName]);
};

/**
 * Removes the entry
 *
 * @param {Function} successCallback is called with no parameters
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.remove = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "remove", [this.fullPath]);
};

/**
 * Returns a URI that can be used to identify this entry.
 *
 * @param {DOMString} mimeType for a FileEntry, the mime type to be used to interpret the file, when loaded through this URI.
 * @return uri
 */
DirectoryEntry.prototype.toURI = function(mimeType) {
    return "file://" + this.fullPath;
};

/**
 * Creates a new DirectoryReader to read entries from this directory
 */
DirectoryEntry.prototype.createReader = function(successCallback, errorCallback) {
    return new DirectoryReader(this.fullPath);
};

/**
 * Creates or looks up a directory
 *
 * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a directory
 * @param {Flags} options to create or excluively create the directory
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getDirectory = function(path, options, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getDirectory", [this.fullPath, path, options]);
};

/**
 * Creates or looks up a file
 *
 * @param {DOMString} path either a relative or absolute path from this directory in which to look up or create a file
 * @param {Flags} options to create or excluively create the file
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.getFile = function(path, options, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getFile", [this.fullPath, path, options]);
};

/**
 * Deletes a directory and all of it's contents
 *
 * @param {Function} successCallback is called with no parameters
 * @param {Function} errorCallback is called with a FileError
 */
DirectoryEntry.prototype.removeRecursively = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "removeRecursively", [this.fullPath]);
};

/**
 * An interface representing a directory on the file system.
 *
 * @constructor
 * {boolean} isFile always true (readonly)
 * {boolean} isDirectory always false (readonly)
 * {DOMString} name of the file, excluding the path leading to it (readonly)
 * {DOMString} fullPath the absolute full path to the file (readonly)
 * {FileSystem} filesystem on which the directory resides (readonly)
 */
var FileEntry = function() {
    this.isFile = true;
    this.isDirectory = false;
    this.name = null;
    this.fullPath = null;
    this.filesystem = null;
};

/**
 * Copies a file to a new location
 *
 * @param {DirectoryEntry} parent the directory to which to copy the entry
 * @param {DOMString} newName the new name of the entry, defaults to the current name
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.copyTo = function(parent, newName, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "copyTo", [this.fullPath, parent, newName]);
};

/**
 * Looks up the metadata of the entry
 *
 * @param {Function} successCallback is called with a Metadata object
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.getMetadata = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getMetadata", [this.fullPath]);
};

/**
 * Gets the parent of the entry
 *
 * @param {Function} successCallback is called with a parent entry
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.getParent = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getParent", [this.fullPath]);
};

/**
 * Moves a directory to a new location
 *
 * @param {DirectoryEntry} parent the directory to which to move the entry
 * @param {DOMString} newName the new name of the entry, defaults to the current name
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.moveTo = function(parent, newName, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "moveTo", [this.fullPath, parent, newName]);
};

/**
 * Removes the entry
 *
 * @param {Function} successCallback is called with no parameters
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.remove = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "remove", [this.fullPath]);
};

/**
 * Returns a URI that can be used to identify this entry.
 *
 * @param {DOMString} mimeType for a FileEntry, the mime type to be used to interpret the file, when loaded through this URI.
 * @return uri
 */
FileEntry.prototype.toURI = function(mimeType) {
    return "file://" + this.fullPath;
};

/**
 * Creates a new FileWriter associated with the file that this FileEntry represents.
 *
 * @param {Function} successCallback is called with the new FileWriter
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.createWriter = function(successCallback, errorCallback) {
    this.file(function(filePointer) {
        var writer = new FileWriter(filePointer);
    
        if (writer.fileName === null || writer.fileName === "") {
            if (typeof errorCallback == "function") {
                errorCallback({
                    "code": FileError.INVALID_STATE_ERR
                });
            }
        }
    
        if (typeof successCallback == "function") {
            successCallback(writer);
        }       
    }, errorCallback);
};

/**
 * Returns a File that represents the current state of the file that this FileEntry represents.
 *
 * @param {Function} successCallback is called with the new File object
 * @param {Function} errorCallback is called with a FileError
 */
FileEntry.prototype.file = function(successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "getFileMetadata", [this.fullPath]);
};

/** @constructor */
var LocalFileSystem = function() {
};

// File error codes
LocalFileSystem.TEMPORARY = 0;
LocalFileSystem.PERSISTENT = 1;
LocalFileSystem.RESOURCE = 2;
LocalFileSystem.APPLICATION = 3;

/**
 * Requests a filesystem in which to store application data.
 *
 * @param {int} type of file system being requested
 * @param {Function} successCallback is called with the new FileSystem
 * @param {Function} errorCallback is called with a FileError
 */
LocalFileSystem.prototype.requestFileSystem = function(type, size, successCallback, errorCallback) {
    if (type < 0 || type > 3) {
        if (typeof errorCallback == "function") {
            errorCallback({
                "code": FileError.SYNTAX_ERR
            });
        }
    }
    else {
        PhoneGap.exec(successCallback, errorCallback, "File", "requestFileSystem", [type, size]);
    }
};

/**
 *
 * @param {DOMString} uri referring to a local file in a filesystem
 * @param {Function} successCallback is called with the new entry
 * @param {Function} errorCallback is called with a FileError
 */
LocalFileSystem.prototype.resolveLocalFileSystemURI = function(uri, successCallback, errorCallback) {
    PhoneGap.exec(successCallback, errorCallback, "File", "resolveLocalFileSystemURI", [uri]);
};

/**
* This function returns and array of contacts.  It is required as we need to convert raw
* JSON objects into concrete Contact objects.  Currently this method is called after
* navigator.service.contacts.find but before the find methods success call back.
*
* @param a JSON Objects that need to be converted to DirectoryEntry or FileEntry objects.
* @returns an entry
*/
LocalFileSystem.prototype._castFS = function(pluginResult) {
    var entry = null;
    entry = new DirectoryEntry();
    entry.isDirectory = pluginResult.message.root.isDirectory;
    entry.isFile = pluginResult.message.root.isFile;
    entry.name = pluginResult.message.root.name;
    entry.fullPath = pluginResult.message.root.fullPath;
    pluginResult.message.root = entry;
    return pluginResult;
};

LocalFileSystem.prototype._castEntry = function(pluginResult) {
    var entry = null;
    if (pluginResult.message.isDirectory) {
        console.log("This is a dir");
        entry = new DirectoryEntry();
    }
    else if (pluginResult.message.isFile) {
        console.log("This is a file");
        entry = new FileEntry();
    }
    entry.isDirectory = pluginResult.message.isDirectory;
    entry.isFile = pluginResult.message.isFile;
    entry.name = pluginResult.message.name;
    entry.fullPath = pluginResult.message.fullPath;
    pluginResult.message = entry;
    return pluginResult;
};

LocalFileSystem.prototype._castEntries = function(pluginResult) {
    var entries = pluginResult.message;
    var retVal = [];
    for (var i=0; i<entries.length; i++) {
        retVal.push(window.localFileSystem._createEntry(entries[i]));
    }
    pluginResult.message = retVal;
    return pluginResult;
};

LocalFileSystem.prototype._createEntry = function(castMe) {
    var entry = null;
    if (castMe.isDirectory) {
        console.log("This is a dir");
        entry = new DirectoryEntry();
    }
    else if (castMe.isFile) {
        console.log("This is a file");
        entry = new FileEntry();
    }
    entry.isDirectory = castMe.isDirectory;
    entry.isFile = castMe.isFile;
    entry.name = castMe.name;
    entry.fullPath = castMe.fullPath;
    return entry;
};

LocalFileSystem.prototype._castDate = function(pluginResult) {
    if (pluginResult.message.modificationTime) {
        var modTime = new Date(pluginResult.message.modificationTime);
        pluginResult.message.modificationTime = modTime;
    }
    else if (pluginResult.message.lastModifiedDate) {
        var file = new File();
        file.size = pluginResult.message.size;
        file.type = pluginResult.message.type;
        file.name = pluginResult.message.name;
        file.fullPath = pluginResult.message.fullPath;
        file.lastModifiedDate = new Date(pluginResult.message.lastModifiedDate);
        pluginResult.message = file;
    }
    return pluginResult;
};

/**
 * Add the FileSystem interface into the browser.
 */
PhoneGap.addConstructor(function() {
	var pgLocalFileSystem = new LocalFileSystem();
	// Needed for cast methods
    if(typeof window.localFileSystem == "undefined") window.localFileSystem  = pgLocalFileSystem;
    if(typeof window.requestFileSystem == "undefined") window.requestFileSystem  = pgLocalFileSystem.requestFileSystem;
    if(typeof window.resolveLocalFileSystemURI == "undefined") window.resolveLocalFileSystemURI = pgLocalFileSystem.resolveLocalFileSystemURI;
});
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("filetransfer")) {
PhoneGap.addResource("filetransfer");

/**
 * FileTransfer uploads a file to a remote server.
 * @constructor
 */
var FileTransfer = function() {};

/**
 * FileUploadResult
 * @constructor
 */
var FileUploadResult = function() {
    this.bytesSent = 0;
    this.responseCode = null;
    this.response = null;
};

/**
 * FileTransferError
 * @constructor
 */
var FileTransferError = function() {
    this.code = null;
};

FileTransferError.FILE_NOT_FOUND_ERR = 1;
FileTransferError.INVALID_URL_ERR = 2;
FileTransferError.CONNECTION_ERR = 3;

/**
* Given an absolute file path, uploads a file on the device to a remote server
* using a multipart HTTP request.
* @param filePath {String}           Full path of the file on the device
* @param server {String}             URL of the server to receive the file
* @param successCallback (Function}  Callback to be invoked when upload has completed
* @param errorCallback {Function}    Callback to be invoked upon error
* @param options {FileUploadOptions} Optional parameters such as file name and mimetype
*/
FileTransfer.prototype.upload = function(filePath, server, successCallback, errorCallback, options, debug) {

    // check for options
    var fileKey = null;
    var fileName = null;
    var mimeType = null;
    var params = null;
    if (options) {
        fileKey = options.fileKey;
        fileName = options.fileName;
        mimeType = options.mimeType;
        if (options.params) {
            params = options.params;
        }
        else {
            params = {};
        }
    }

    PhoneGap.exec(successCallback, errorCallback, 'FileTransfer', 'upload', [filePath, server, fileKey, fileName, mimeType, params, debug]);
};

/**
 * Options to customize the HTTP request used to upload files.
 * @constructor
 * @param fileKey {String}   Name of file request parameter.
 * @param fileName {String}  Filename to be used by the server. Defaults to image.jpg.
 * @param mimeType {String}  Mimetype of the uploaded file. Defaults to image/jpeg.
 * @param params {Object}    Object with key: value params to send to the server.
 */
var FileUploadOptions = function(fileKey, fileName, mimeType, params) {
    this.fileKey = fileKey || null;
    this.fileName = fileName || null;
    this.mimeType = mimeType || null;
    this.params = params || null;
};
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("geolocation")) {
PhoneGap.addResource("geolocation");

/**
 * This class provides access to device GPS data.
 * @constructor
 */
var Geolocation = function() {

    // The last known GPS position.
    this.lastPosition = null;

    // Geolocation listeners
    this.listeners = {};
};

/**
 * Position error object
 *
 * @constructor
 * @param code
 * @param message
 */
var PositionError = function(code, message) {
    this.code = code;
    this.message = message;
};

PositionError.PERMISSION_DENIED = 1;
PositionError.POSITION_UNAVAILABLE = 2;
PositionError.TIMEOUT = 3;

/**
 * Asynchronously aquires the current position.
 *
 * @param {Function} successCallback    The function to call when the position data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the heading position. (OPTIONAL)
 * @param {PositionOptions} options     The options for getting the position data. (OPTIONAL)
 */
Geolocation.prototype.getCurrentPosition = function(successCallback, errorCallback, options) {
    if (navigator._geo.listeners.global) {
        console.log("Geolocation Error: Still waiting for previous getCurrentPosition() request.");
        try {
            errorCallback(new PositionError(PositionError.TIMEOUT, "Geolocation Error: Still waiting for previous getCurrentPosition() request."));
        } catch (e) {
        }
        return;
    }
    var maximumAge = 10000;
    var enableHighAccuracy = false;
    var timeout = 10000;
    if (typeof options !== "undefined") {
        if (typeof options.maximumAge !== "undefined") {
            maximumAge = options.maximumAge;
        }
        if (typeof options.enableHighAccuracy !== "undefined") {
            enableHighAccuracy = options.enableHighAccuracy;
        }
        if (typeof options.timeout !== "undefined") {
            timeout = options.timeout;
        }
    }
    navigator._geo.listeners.global = {"success" : successCallback, "fail" : errorCallback };
    PhoneGap.exec(null, null, "Geolocation", "getCurrentLocation", [enableHighAccuracy, timeout, maximumAge]);
};

/**
 * Asynchronously watches the geolocation for changes to geolocation.  When a change occurs,
 * the successCallback is called with the new location.
 *
 * @param {Function} successCallback    The function to call each time the location data is available
 * @param {Function} errorCallback      The function to call when there is an error getting the location data. (OPTIONAL)
 * @param {PositionOptions} options     The options for getting the location data such as frequency. (OPTIONAL)
 * @return String                       The watch id that must be passed to #clearWatch to stop watching.
 */
Geolocation.prototype.watchPosition = function(successCallback, errorCallback, options) {
    var maximumAge = 10000;
    var enableHighAccuracy = false;
    var timeout = 10000;
    if (typeof options !== "undefined") {
        if (typeof options.frequency  !== "undefined") {
            maximumAge = options.frequency;
        }
        if (typeof options.maximumAge !== "undefined") {
            maximumAge = options.maximumAge;
        }
        if (typeof options.enableHighAccuracy !== "undefined") {
            enableHighAccuracy = options.enableHighAccuracy;
        }
        if (typeof options.timeout !== "undefined") {
            timeout = options.timeout;
        }
    }
    var id = PhoneGap.createUUID();
    navigator._geo.listeners[id] = {"success" : successCallback, "fail" : errorCallback };
    PhoneGap.exec(null, null, "Geolocation", "start", [id, enableHighAccuracy, timeout, maximumAge]);
    return id;
};

/*
 * Native callback when watch position has a new position.
 * PRIVATE METHOD
 *
 * @param {String} id
 * @param {Number} lat
 * @param {Number} lng
 * @param {Number} alt
 * @param {Number} altacc
 * @param {Number} head
 * @param {Number} vel
 * @param {Number} stamp
 */
Geolocation.prototype.success = function(id, lat, lng, alt, altacc, head, vel, stamp) {
    var coords = new Coordinates(lat, lng, alt, altacc, head, vel);
    var loc = new Position(coords, stamp);
    try {
        if (lat === "undefined" || lng === "undefined") {
            navigator._geo.listeners[id].fail(new PositionError(PositionError.POSITION_UNAVAILABLE, "Lat/Lng are undefined."));
        }
        else {
            navigator._geo.lastPosition = loc;
            navigator._geo.listeners[id].success(loc);
        }
    }
    catch (e) {
        console.log("Geolocation Error: Error calling success callback function.");
    }

    if (id === "global") {
        delete navigator._geo.listeners.global;
    }
};

/**
 * Native callback when watch position has an error.
 * PRIVATE METHOD
 *
 * @param {String} id       The ID of the watch
 * @param {Number} code     The error code
 * @param {String} msg      The error message
 */
Geolocation.prototype.fail = function(id, code, msg) {
    try {
        navigator._geo.listeners[id].fail(new PositionError(code, msg));
    }
    catch (e) {
        console.log("Geolocation Error: Error calling error callback function.");
    }
};

/**
 * Clears the specified heading watch.
 *
 * @param {String} id       The ID of the watch returned from #watchPosition
 */
Geolocation.prototype.clearWatch = function(id) {
    PhoneGap.exec(null, null, "Geolocation", "stop", [id]);
    delete navigator._geo.listeners[id];
};

/**
 * Force the PhoneGap geolocation to be used instead of built-in.
 */
Geolocation.usingPhoneGap = false;
Geolocation.usePhoneGap = function() {
    if (Geolocation.usingPhoneGap) {
        return;
    }
    Geolocation.usingPhoneGap = true;

    // Set built-in geolocation methods to our own implementations
    // (Cannot replace entire geolocation, but can replace individual methods)
    navigator.geolocation.setLocation = navigator._geo.setLocation;
    navigator.geolocation.getCurrentPosition = navigator._geo.getCurrentPosition;
    navigator.geolocation.watchPosition = navigator._geo.watchPosition;
    navigator.geolocation.clearWatch = navigator._geo.clearWatch;
    navigator.geolocation.start = navigator._geo.start;
    navigator.geolocation.stop = navigator._geo.stop;
};

PhoneGap.addConstructor(function() {
    navigator._geo = new Geolocation();

    // No native geolocation object for Android 1.x, so use PhoneGap geolocation
    if (typeof navigator.geolocation === 'undefined') {
        navigator.geolocation = navigator._geo;
        Geolocation.usingPhoneGap = true;
    }
});
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010, IBM Corporation
 */


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("media")) {
PhoneGap.addResource("media");

/**
 * This class provides access to the device media, interfaces to both sound and video
 *
 * @constructor
 * @param src                   The file name or url to play
 * @param successCallback       The callback to be called when the file is done playing or recording.
 *                                  successCallback() - OPTIONAL
 * @param errorCallback         The callback to be called if there is an error.
 *                                  errorCallback(int errorCode) - OPTIONAL
 * @param statusCallback        The callback to be called when media status has changed.
 *                                  statusCallback(int statusCode) - OPTIONAL
 * @param positionCallback      The callback to be called when media position has changed.
 *                                  positionCallback(long position) - OPTIONAL
 */
var Media = function(src, successCallback, errorCallback, statusCallback, positionCallback) {

    // successCallback optional
    if (successCallback && (typeof successCallback !== "function")) {
        console.log("Media Error: successCallback is not a function");
        return;
    }

    // errorCallback optional
    if (errorCallback && (typeof errorCallback !== "function")) {
        console.log("Media Error: errorCallback is not a function");
        return;
    }

    // statusCallback optional
    if (statusCallback && (typeof statusCallback !== "function")) {
        console.log("Media Error: statusCallback is not a function");
        return;
    }

    // statusCallback optional
    if (positionCallback && (typeof positionCallback !== "function")) {
        console.log("Media Error: positionCallback is not a function");
        return;
    }

    this.id = PhoneGap.createUUID();
    PhoneGap.mediaObjects[this.id] = this;
    this.src = src;
    this.successCallback = successCallback;
    this.errorCallback = errorCallback;
    this.statusCallback = statusCallback;
    this.positionCallback = positionCallback;
    this._duration = -1;
    this._position = -1;
};

// Media messages
Media.MEDIA_STATE = 1;
Media.MEDIA_DURATION = 2;
Media.MEDIA_POSITION = 3;
Media.MEDIA_ERROR = 9;

// Media states
Media.MEDIA_NONE = 0;
Media.MEDIA_STARTING = 1;
Media.MEDIA_RUNNING = 2;
Media.MEDIA_PAUSED = 3;
Media.MEDIA_STOPPED = 4;
Media.MEDIA_MSG = ["None", "Starting", "Running", "Paused", "Stopped"];

// TODO: Will MediaError be used?
/**
 * This class contains information about any Media errors.
 * @constructor
 */
var MediaError = function() {
    this.code = null;
    this.message = "";
};

MediaError.MEDIA_ERR_ABORTED        = 1;
MediaError.MEDIA_ERR_NETWORK        = 2;
MediaError.MEDIA_ERR_DECODE         = 3;
MediaError.MEDIA_ERR_NONE_SUPPORTED = 4;

/**
 * Start or resume playing audio file.
 */
Media.prototype.play = function() {
    PhoneGap.exec(null, null, "Media", "startPlayingAudio", [this.id, this.src]);
};

/**
 * Stop playing audio file.
 */
Media.prototype.stop = function() {
    return PhoneGap.exec(null, null, "Media", "stopPlayingAudio", [this.id]);
};

/**
 * Seek or jump to a new time in the track..
 */
Media.prototype.seekTo = function(milliseconds) {
    PhoneGap.exec(null, null, "Media", "seekToAudio", [this.id, milliseconds]);
};

/**
 * Pause playing audio file.
 */
Media.prototype.pause = function() {
    PhoneGap.exec(null, null, "Media", "pausePlayingAudio", [this.id]);
};

/**
 * Get duration of an audio file.
 * The duration is only set for audio that is playing, paused or stopped.
 *
 * @return      duration or -1 if not known.
 */
Media.prototype.getDuration = function() {
    return this._duration;
};

/**
 * Get position of audio.
 */
Media.prototype.getCurrentPosition = function(success, fail) {
    PhoneGap.exec(success, fail, "Media", "getCurrentPositionAudio", [this.id]);
};

/**
 * Start recording audio file.
 */
Media.prototype.startRecord = function() {
    PhoneGap.exec(null, null, "Media", "startRecordingAudio", [this.id, this.src]);
};

/**
 * Stop recording audio file.
 */
Media.prototype.stopRecord = function() {
    PhoneGap.exec(null, null, "Media", "stopRecordingAudio", [this.id]);
};

/**
 * Release the resources.
 */
Media.prototype.release = function() {
    PhoneGap.exec(null, null, "Media", "release", [this.id]);
};

/**
 * List of media objects.
 * PRIVATE
 */
PhoneGap.mediaObjects = {};

/**
 * Object that receives native callbacks.
 * PRIVATE
 * @constructor
 */
PhoneGap.Media = function() {};

/**
 * Get the media object.
 * PRIVATE
 *
 * @param id            The media object id (string)
 */
PhoneGap.Media.getMediaObject = function(id) {
    return PhoneGap.mediaObjects[id];
};

/**
 * Audio has status update.
 * PRIVATE
 *
 * @param id            The media object id (string)
 * @param status        The status code (int)
 * @param msg           The status message (string)
 */
PhoneGap.Media.onStatus = function(id, msg, value) {
    var media = PhoneGap.mediaObjects[id];
    // If state update
    if (msg === Media.MEDIA_STATE) {
        if (value === Media.MEDIA_STOPPED) {
            if (media.successCallback) {
                media.successCallback();
            }
        }
        if (media.statusCallback) {
            media.statusCallback(value);
        }
    }
    else if (msg === Media.MEDIA_DURATION) {
        media._duration = value;
    }
    else if (msg === Media.MEDIA_ERROR) {
        if (media.errorCallback) {
            media.errorCallback(value);
        }
    }
    else if (msg == Media.MEDIA_POSITION) {
        media._position = value;
    }
};
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("network")) {
PhoneGap.addResource("network");

/**
 * This class contains information about the current network Connection.
 * @constructor
 */
var Connection = function() {
    this.type = null;
    this._firstRun = true;
    this._timer = null;
    this.timeout = 500;

    var me = this;
    this.getInfo(
        function(type) {
            // Need to send events if we are on or offline
            if (type == "none") {
                // set a timer if still offline at the end of timer send the offline event
                me._timer = setTimeout(function(){
                    me.type = type;
                    PhoneGap.fireEvent('offline');
                    me._timer = null;
                    }, me.timeout);
            } else {
                // If there is a current offline event pending clear it
                if (me._timer != null) {
                    clearTimeout(me._timer);
                    me._timer = null;
                }
                me.type = type;
                PhoneGap.fireEvent('online');
            }
            
            // should only fire this once
            if (me._firstRun) {
                me._firstRun = false;
                PhoneGap.onPhoneGapConnectionReady.fire();
            }            
        },
        function(e) {
            console.log("Error initializing Network Connection: " + e);
        });
};

Connection.UNKNOWN = "unknown";
Connection.ETHERNET = "ethernet";
Connection.WIFI = "wifi";
Connection.CELL_2G = "2g";
Connection.CELL_3G = "3g";
Connection.CELL_4G = "4g";
Connection.NONE = "none";

/**
 * Get connection info
 *
 * @param {Function} successCallback The function to call when the Connection data is available
 * @param {Function} errorCallback The function to call when there is an error getting the Connection data. (OPTIONAL)
 */
Connection.prototype.getInfo = function(successCallback, errorCallback) {
    // Get info
    PhoneGap.exec(successCallback, errorCallback, "Network Status", "getConnectionInfo", []);
};


PhoneGap.addConstructor(function() {
    if (typeof navigator.network === "undefined") {
        navigator.network = new Object();
    }
    if (typeof navigator.network.connection === "undefined") {
        navigator.network.connection = new Connection();
    }
});
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("notification")) {
PhoneGap.addResource("notification");

/**
 * This class provides access to notifications on the device.
 * @constructor
 */
var Notification = function() {
};

/**
 * Open a native alert dialog, with a customizable title and button text.
 *
 * @param {String} message              Message to print in the body of the alert
 * @param {Function} completeCallback   The callback that is called when user clicks on a button.
 * @param {String} title                Title of the alert dialog (default: Alert)
 * @param {String} buttonLabel          Label of the close button (default: OK)
 */
Notification.prototype.alert = function(message, completeCallback, title, buttonLabel) {
    var _title = (title || "Alert");
    var _buttonLabel = (buttonLabel || "OK");
    PhoneGap.exec(completeCallback, null, "Notification", "alert", [message,_title,_buttonLabel]);
};

/**
 * Open a native confirm dialog, with a customizable title and button text.
 * The result that the user selects is returned to the result callback.
 *
 * @param {String} message              Message to print in the body of the alert
 * @param {Function} resultCallback     The callback that is called when user clicks on a button.
 * @param {String} title                Title of the alert dialog (default: Confirm)
 * @param {String} buttonLabels         Comma separated list of the labels of the buttons (default: 'OK,Cancel')
 */
Notification.prototype.confirm = function(message, resultCallback, title, buttonLabels) {
    var _title = (title || "Confirm");
    var _buttonLabels = (buttonLabels || "OK,Cancel");
    PhoneGap.exec(resultCallback, null, "Notification", "confirm", [message,_title,_buttonLabels]);
};

/**
 * Start spinning the activity indicator on the statusbar
 */
Notification.prototype.activityStart = function() {
    PhoneGap.exec(null, null, "Notification", "activityStart", ["Busy","Please wait..."]);
};

/**
 * Stop spinning the activity indicator on the statusbar, if it's currently spinning
 */
Notification.prototype.activityStop = function() {
    PhoneGap.exec(null, null, "Notification", "activityStop", []);
};

/**
 * Display a progress dialog with progress bar that goes from 0 to 100.
 *
 * @param {String} title        Title of the progress dialog.
 * @param {String} message      Message to display in the dialog.
 */
Notification.prototype.progressStart = function(title, message) {
    PhoneGap.exec(null, null, "Notification", "progressStart", [title, message]);
};

/**
 * Set the progress dialog value.
 *
 * @param {Number} value         0-100
 */
Notification.prototype.progressValue = function(value) {
    PhoneGap.exec(null, null, "Notification", "progressValue", [value]);
};

/**
 * Close the progress dialog.
 */
Notification.prototype.progressStop = function() {
    PhoneGap.exec(null, null, "Notification", "progressStop", []);
};

/**
 * Causes the device to blink a status LED.
 *
 * @param {Integer} count       The number of blinks.
 * @param {String} colour       The colour of the light.
 */
Notification.prototype.blink = function(count, colour) {
    // NOT IMPLEMENTED
};

/**
 * Causes the device to vibrate.
 *
 * @param {Integer} mills       The number of milliseconds to vibrate for.
 */
Notification.prototype.vibrate = function(mills) {
    PhoneGap.exec(null, null, "Notification", "vibrate", [mills]);
};

/**
 * Causes the device to beep.
 * On Android, the default notification ringtone is played "count" times.
 *
 * @param {Integer} count       The number of beeps.
 */
Notification.prototype.beep = function(count) {
    PhoneGap.exec(null, null, "Notification", "beep", [count]);
};

PhoneGap.addConstructor(function() {
    if (typeof navigator.notification === "undefined") {
        navigator.notification = new Notification();
    }
});
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

if (!PhoneGap.hasResource("position")) {
PhoneGap.addResource("position");

/**
 * This class contains position information.
 * @param {Object} lat
 * @param {Object} lng
 * @param {Object} acc
 * @param {Object} alt
 * @param {Object} altacc
 * @param {Object} head
 * @param {Object} vel
 * @constructor
 */
var Position = function(coords, timestamp) {
	this.coords = coords;
	this.timestamp = (timestamp !== 'undefined') ? timestamp : new Date().getTime();
};

/** @constructor */
var Coordinates = function(lat, lng, alt, acc, head, vel, altacc) {
	/**
	 * The latitude of the position.
	 */
	this.latitude = lat;
	/**
	 * The longitude of the position,
	 */
	this.longitude = lng;
	/**
	 * The accuracy of the position.
	 */
	this.accuracy = acc;
	/**
	 * The altitude of the position.
	 */
	this.altitude = alt;
	/**
	 * The direction the device is moving at the position.
	 */
	this.heading = head;
	/**
	 * The velocity with which the device is moving at the position.
	 */
	this.speed = vel;
	/**
	 * The altitude accuracy of the position.
	 */
	this.altitudeAccuracy = (altacc !== 'undefined') ? altacc : null;
};

/**
 * This class specifies the options for requesting position data.
 * @constructor
 */
var PositionOptions = function() {
	/**
	 * Specifies the desired position accuracy.
	 */
	this.enableHighAccuracy = true;
	/**
	 * The timeout after which if position data cannot be obtained the errorCallback
	 * is called.
	 */
	this.timeout = 10000;
};

/**
 * This class contains information about any GSP errors.
 * @constructor
 */
var PositionError = function() {
	this.code = null;
	this.message = "";
};

PositionError.UNKNOWN_ERROR = 0;
PositionError.PERMISSION_DENIED = 1;
PositionError.POSITION_UNAVAILABLE = 2;
PositionError.TIMEOUT = 3;
}


/*
 * PhoneGap is available under *either* the terms of the modified BSD license *or* the
 * MIT License (2008). See http://opensource.org/licenses/alphabetical for full text.
 *
 * Copyright (c) 2005-2010, Nitobi Software Inc.
 * Copyright (c) 2010-2011, IBM Corporation
 */

/*
 * This is purely for the Android 1.5/1.6 HTML 5 Storage
 * I was hoping that Android 2.0 would deprecate this, but given the fact that
 * most manufacturers ship with Android 1.5 and do not do OTA Updates, this is required
 */

if (!PhoneGap.hasResource("storage")) {
PhoneGap.addResource("storage");

/**
 * SQL result set object
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB_Rows = function() {
    this.resultSet = [];    // results array
    this.length = 0;        // number of rows
};

/**
 * Get item from SQL result set
 *
 * @param row           The row number to return
 * @return              The row object
 */
DroidDB_Rows.prototype.item = function(row) {
    return this.resultSet[row];
};

/**
 * SQL result set that is returned to user.
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB_Result = function() {
    this.rows = new DroidDB_Rows();
};

/**
 * Storage object that is called by native code when performing queries.
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB = function() {
    this.queryQueue = {};
};

/**
 * Callback from native code when query is complete.
 * PRIVATE METHOD
 *
 * @param id                Query id
 */
DroidDB.prototype.completeQuery = function(id, data) {
    var query = this.queryQueue[id];
    if (query) {
        try {
            delete this.queryQueue[id];

            // Get transaction
            var tx = query.tx;

            // If transaction hasn't failed
            // Note: We ignore all query results if previous query
            //       in the same transaction failed.
            if (tx && tx.queryList[id]) {

                // Save query results
                var r = new DroidDB_Result();
                r.rows.resultSet = data;
                r.rows.length = data.length;
                try {
                    if (typeof query.successCallback === 'function') {
                        query.successCallback(query.tx, r);
                    }
                } catch (ex) {
                    console.log("executeSql error calling user success callback: "+ex);
                }

                tx.queryComplete(id);
            }
        } catch (e) {
            console.log("executeSql error: "+e);
        }
    }
};

/**
 * Callback from native code when query fails
 * PRIVATE METHOD
 *
 * @param reason            Error message
 * @param id                Query id
 */
DroidDB.prototype.fail = function(reason, id) {
    var query = this.queryQueue[id];
    if (query) {
        try {
            delete this.queryQueue[id];

            // Get transaction
            var tx = query.tx;

            // If transaction hasn't failed
            // Note: We ignore all query results if previous query
            //       in the same transaction failed.
            if (tx && tx.queryList[id]) {
                tx.queryList = {};

                try {
                    if (typeof query.errorCallback === 'function') {
                        query.errorCallback(query.tx, reason);
                    }
                } catch (ex) {
                    console.log("executeSql error calling user error callback: "+ex);
                }

                tx.queryFailed(id, reason);
            }

        } catch (e) {
            console.log("executeSql error: "+e);
        }
    }
};

/**
 * SQL query object
 * PRIVATE METHOD
 *
 * @constructor
 * @param tx                The transaction object that this query belongs to
 */
var DroidDB_Query = function(tx) {

    // Set the id of the query
    this.id = PhoneGap.createUUID();

    // Add this query to the queue
    droiddb.queryQueue[this.id] = this;

    // Init result
    this.resultSet = [];

    // Set transaction that this query belongs to
    this.tx = tx;

    // Add this query to transaction list
    this.tx.queryList[this.id] = this;

    // Callbacks
    this.successCallback = null;
    this.errorCallback = null;

};

/**
 * Transaction object
 * PRIVATE METHOD
 * @constructor
 */
var DroidDB_Tx = function() {

    // Set the id of the transaction
    this.id = PhoneGap.createUUID();

    // Callbacks
    this.successCallback = null;
    this.errorCallback = null;

    // Query list
    this.queryList = {};
};

/**
 * Mark query in transaction as complete.
 * If all queries are complete, call the user's transaction success callback.
 *
 * @param id                Query id
 */
DroidDB_Tx.prototype.queryComplete = function(id) {
    delete this.queryList[id];

    // If no more outstanding queries, then fire transaction success
    if (this.successCallback) {
        var count = 0;
        var i;
        for (i in this.queryList) {
            if (this.queryList.hasOwnProperty(i)) {
                count++;
            }
        }
        if (count === 0) {
            try {
                this.successCallback();
            } catch(e) {
                console.log("Transaction error calling user success callback: " + e);
            }
        }
    }
};

/**
 * Mark query in transaction as failed.
 *
 * @param id                Query id
 * @param reason            Error message
 */
DroidDB_Tx.prototype.queryFailed = function(id, reason) {

    // The sql queries in this transaction have already been run, since
    // we really don't have a real transaction implemented in native code.
    // However, the user callbacks for the remaining sql queries in transaction
    // will not be called.
    this.queryList = {};

    if (this.errorCallback) {
        try {
            this.errorCallback(reason);
        } catch(e) {
            console.log("Transaction error calling user error callback: " + e);
        }
    }
};

/**
 * Execute SQL statement
 *
 * @param sql                   SQL statement to execute
 * @param params                Statement parameters
 * @param successCallback       Success callback
 * @param errorCallback         Error callback
 */
DroidDB_Tx.prototype.executeSql = function(sql, params, successCallback, errorCallback) {

    // Init params array
    if (typeof params === 'undefined') {
        params = [];
    }

    // Create query and add to queue
    var query = new DroidDB_Query(this);
    droiddb.queryQueue[query.id] = query;

    // Save callbacks
    query.successCallback = successCallback;
    query.errorCallback = errorCallback;

    // Call native code
    PhoneGap.exec(null, null, "Storage", "executeSql", [sql, params, query.id]);
};

var DatabaseShell = function() {
};

/**
 * Start a transaction.
 * Does not support rollback in event of failure.
 *
 * @param process {Function}            The transaction function
 * @param successCallback {Function}
 * @param errorCallback {Function}
 */
DatabaseShell.prototype.transaction = function(process, errorCallback, successCallback) {
    var tx = new DroidDB_Tx();
    tx.successCallback = successCallback;
    tx.errorCallback = errorCallback;
    try {
        process(tx);
    } catch (e) {
        console.log("Transaction error: "+e);
        if (tx.errorCallback) {
            try {
                tx.errorCallback(e);
            } catch (ex) {
                console.log("Transaction error calling user error callback: "+e);
            }
        }
    }
};

/**
 * Open database
 *
 * @param name              Database name
 * @param version           Database version
 * @param display_name      Database display name
 * @param size              Database size in bytes
 * @return                  Database object
 */
var DroidDB_openDatabase = function(name, version, display_name, size) {
    PhoneGap.exec(null, null, "Storage", "openDatabase", [name, version, display_name, size]);
    var db = new DatabaseShell();
    return db;
};

/**
 * For browsers with no localStorage we emulate it with SQLite. Follows the w3c api.
 * TODO: Do similar for sessionStorage.
 */

/**
 * @constructor
 */
var CupcakeLocalStorage = function() {
		try {

			this.db = openDatabase('localStorage', '1.0', 'localStorage', 2621440);
			var storage = {};
			this.length = 0;
			function setLength (length) {
				this.length = length;
				localStorage.length = length;
			}
			this.db.transaction(
				function (transaction) {
				    var i;
					transaction.executeSql('CREATE TABLE IF NOT EXISTS storage (id NVARCHAR(40) PRIMARY KEY, body NVARCHAR(255))');
					transaction.executeSql('SELECT * FROM storage', [], function(tx, result) {
						for(var i = 0; i < result.rows.length; i++) {
							storage[result.rows.item(i)['id']] =  result.rows.item(i)['body'];
						}
						setLength(result.rows.length);
						PhoneGap.initializationComplete("cupcakeStorage");
					});

				},
				function (err) {
					alert(err.message);
				}
			);
			this.setItem = function(key, val) {
				if (typeof(storage[key])=='undefined') {
					this.length++;
				}
				storage[key] = val;
				this.db.transaction(
					function (transaction) {
						transaction.executeSql('CREATE TABLE IF NOT EXISTS storage (id NVARCHAR(40) PRIMARY KEY, body NVARCHAR(255))');
						transaction.executeSql('REPLACE INTO storage (id, body) values(?,?)', [key,val]);
					}
				);
			};
			this.getItem = function(key) {
				return storage[key];
			};
			this.removeItem = function(key) {
				delete storage[key];
				this.length--;
				this.db.transaction(
					function (transaction) {
						transaction.executeSql('CREATE TABLE IF NOT EXISTS storage (id NVARCHAR(40) PRIMARY KEY, body NVARCHAR(255))');
						transaction.executeSql('DELETE FROM storage where id=?', [key]);
					}
				);
			};
			this.clear = function() {
				storage = {};
				this.length = 0;
				this.db.transaction(
					function (transaction) {
						transaction.executeSql('CREATE TABLE IF NOT EXISTS storage (id NVARCHAR(40) PRIMARY KEY, body NVARCHAR(255))');
						transaction.executeSql('DELETE FROM storage', []);
					}
				);
			};
			this.key = function(index) {
				var i = 0;
				for (var j in storage) {
					if (i==index) {
						return j;
					} else {
						i++;
					}
				}
				return null;
			};

		} catch(e) {
			alert("Database error "+e+".");
		    return;
		}
};

PhoneGap.addConstructor(function() {
    var setupDroidDB = function() {
        navigator.openDatabase = window.openDatabase = DroidDB_openDatabase;
        window.droiddb = new DroidDB();
    }
    if (typeof window.openDatabase === "undefined") {
        setupDroidDB();
    } else {
        window.openDatabase_orig = window.openDatabase;
        window.openDatabase = function(name, version, desc, size){
            // Some versions of Android will throw a SECURITY_ERR so we need 
            // to catch the exception and seutp our own DB handling.
            var db = null;
            try {
                db = window.openDatabase_orig(name, version, desc, size);
            } 
            catch (ex) {
                db = null;
            }

            if (db == null) {
                setupDroidDB();
                return DroidDB_openDatabase(name, version, desc, size);
            }
            else {
                return db;
            }
        }
    }
    
    if (typeof window.localStorage === "undefined") {
        navigator.localStorage = window.localStorage = new CupcakeLocalStorage();
        PhoneGap.waitForInitialization("cupcakeStorage");
    }
});
}


/*!
 * jQuery JavaScript Library v1.6.2
 * http://jquery.com/
 *
 * Copyright 2011, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 * Copyright 2011, The Dojo Foundation
 * Released under the MIT, BSD, and GPL Licenses.
 *
 * Date: Thu Jun 30 14:16:56 2011 -0400
 */
(function(a,b){function cv(a){return f.isWindow(a)?a:a.nodeType===9?a.defaultView||a.parentWindow:!1}function cs(a){if(!cg[a]){var b=c.body,d=f("<"+a+">").appendTo(b),e=d.css("display");d.remove();if(e==="none"||e===""){ch||(ch=c.createElement("iframe"),ch.frameBorder=ch.width=ch.height=0),b.appendChild(ch);if(!ci||!ch.createElement)ci=(ch.contentWindow||ch.contentDocument).document,ci.write((c.compatMode==="CSS1Compat"?"<!doctype html>":"")+"<html><body>"),ci.close();d=ci.createElement(a),ci.body.appendChild(d),e=f.css(d,"display"),b.removeChild(ch)}cg[a]=e}return cg[a]}function cr(a,b){var c={};f.each(cm.concat.apply([],cm.slice(0,b)),function(){c[this]=a});return c}function cq(){cn=b}function cp(){setTimeout(cq,0);return cn=f.now()}function cf(){try{return new a.ActiveXObject("Microsoft.XMLHTTP")}catch(b){}}function ce(){try{return new a.XMLHttpRequest}catch(b){}}function b$(a,c){a.dataFilter&&(c=a.dataFilter(c,a.dataType));var d=a.dataTypes,e={},g,h,i=d.length,j,k=d[0],l,m,n,o,p;for(g=1;g<i;g++){if(g===1)for(h in a.converters)typeof h=="string"&&(e[h.toLowerCase()]=a.converters[h]);l=k,k=d[g];if(k==="*")k=l;else if(l!=="*"&&l!==k){m=l+" "+k,n=e[m]||e["* "+k];if(!n){p=b;for(o in e){j=o.split(" ");if(j[0]===l||j[0]==="*"){p=e[j[1]+" "+k];if(p){o=e[o],o===!0?n=p:p===!0&&(n=o);break}}}}!n&&!p&&f.error("No conversion from "+m.replace(" "," to ")),n!==!0&&(c=n?n(c):p(o(c)))}}return c}function bZ(a,c,d){var e=a.contents,f=a.dataTypes,g=a.responseFields,h,i,j,k;for(i in g)i in d&&(c[g[i]]=d[i]);while(f[0]==="*")f.shift(),h===b&&(h=a.mimeType||c.getResponseHeader("content-type"));if(h)for(i in e)if(e[i]&&e[i].test(h)){f.unshift(i);break}if(f[0]in d)j=f[0];else{for(i in d){if(!f[0]||a.converters[i+" "+f[0]]){j=i;break}k||(k=i)}j=j||k}if(j){j!==f[0]&&f.unshift(j);return d[j]}}function bY(a,b,c,d){if(f.isArray(b))f.each(b,function(b,e){c||bC.test(a)?d(a,e):bY(a+"["+(typeof e=="object"||f.isArray(e)?b:"")+"]",e,c,d)});else if(!c&&b!=null&&typeof b=="object")for(var e in b)bY(a+"["+e+"]",b[e],c,d);else d(a,b)}function bX(a,c,d,e,f,g){f=f||c.dataTypes[0],g=g||{},g[f]=!0;var h=a[f],i=0,j=h?h.length:0,k=a===bR,l;for(;i<j&&(k||!l);i++)l=h[i](c,d,e),typeof l=="string"&&(!k||g[l]?l=b:(c.dataTypes.unshift(l),l=bX(a,c,d,e,l,g)));(k||!l)&&!g["*"]&&(l=bX(a,c,d,e,"*",g));return l}function bW(a){return function(b,c){typeof b!="string"&&(c=b,b="*");if(f.isFunction(c)){var d=b.toLowerCase().split(bN),e=0,g=d.length,h,i,j;for(;e<g;e++)h=d[e],j=/^\+/.test(h),j&&(h=h.substr(1)||"*"),i=a[h]=a[h]||[],i[j?"unshift":"push"](c)}}}function bA(a,b,c){var d=b==="width"?a.offsetWidth:a.offsetHeight,e=b==="width"?bv:bw;if(d>0){c!=="border"&&f.each(e,function(){c||(d-=parseFloat(f.css(a,"padding"+this))||0),c==="margin"?d+=parseFloat(f.css(a,c+this))||0:d-=parseFloat(f.css(a,"border"+this+"Width"))||0});return d+"px"}d=bx(a,b,b);if(d<0||d==null)d=a.style[b]||0;d=parseFloat(d)||0,c&&f.each(e,function(){d+=parseFloat(f.css(a,"padding"+this))||0,c!=="padding"&&(d+=parseFloat(f.css(a,"border"+this+"Width"))||0),c==="margin"&&(d+=parseFloat(f.css(a,c+this))||0)});return d+"px"}function bm(a,b){b.src?f.ajax({url:b.src,async:!1,dataType:"script"}):f.globalEval((b.text||b.textContent||b.innerHTML||"").replace(be,"/*$0*/")),b.parentNode&&b.parentNode.removeChild(b)}function bl(a){f.nodeName(a,"input")?bk(a):"getElementsByTagName"in a&&f.grep(a.getElementsByTagName("input"),bk)}function bk(a){if(a.type==="checkbox"||a.type==="radio")a.defaultChecked=a.checked}function bj(a){return"getElementsByTagName"in a?a.getElementsByTagName("*"):"querySelectorAll"in a?a.querySelectorAll("*"):[]}function bi(a,b){var c;if(b.nodeType===1){b.clearAttributes&&b.clearAttributes(),b.mergeAttributes&&b.mergeAttributes(a),c=b.nodeName.toLowerCase();if(c==="object")b.outerHTML=a.outerHTML;else if(c!=="input"||a.type!=="checkbox"&&a.type!=="radio"){if(c==="option")b.selected=a.defaultSelected;else if(c==="input"||c==="textarea")b.defaultValue=a.defaultValue}else a.checked&&(b.defaultChecked=b.checked=a.checked),b.value!==a.value&&(b.value=a.value);b.removeAttribute(f.expando)}}function bh(a,b){if(b.nodeType===1&&!!f.hasData(a)){var c=f.expando,d=f.data(a),e=f.data(b,d);if(d=d[c]){var g=d.events;e=e[c]=f.extend({},d);if(g){delete e.handle,e.events={};for(var h in g)for(var i=0,j=g[h].length;i<j;i++)f.event.add(b,h+(g[h][i].namespace?".":"")+g[h][i].namespace,g[h][i],g[h][i].data)}}}}function bg(a,b){return f.nodeName(a,"table")?a.getElementsByTagName("tbody")[0]||a.appendChild(a.ownerDocument.createElement("tbody")):a}function W(a,b,c){b=b||0;if(f.isFunction(b))return f.grep(a,function(a,d){var e=!!b.call(a,d,a);return e===c});if(b.nodeType)return f.grep(a,function(a,d){return a===b===c});if(typeof b=="string"){var d=f.grep(a,function(a){return a.nodeType===1});if(R.test(b))return f.filter(b,d,!c);b=f.filter(b,d)}return f.grep(a,function(a,d){return f.inArray(a,b)>=0===c})}function V(a){return!a||!a.parentNode||a.parentNode.nodeType===11}function N(a,b){return(a&&a!=="*"?a+".":"")+b.replace(z,"`").replace(A,"&")}function M(a){var b,c,d,e,g,h,i,j,k,l,m,n,o,p=[],q=[],r=f._data(this,"events");if(!(a.liveFired===this||!r||!r.live||a.target.disabled||a.button&&a.type==="click")){a.namespace&&(n=new RegExp("(^|\\.)"+a.namespace.split(".").join("\\.(?:.*\\.)?")+"(\\.|$)")),a.liveFired=this;var s=r.live.slice(0);for(i=0;i<s.length;i++)g=s[i],g.origType.replace(x,"")===a.type?q.push(g.selector):s.splice(i--,1);e=f(a.target).closest(q,a.currentTarget);for(j=0,k=e.length;j<k;j++){m=e[j];for(i=0;i<s.length;i++){g=s[i];if(m.selector===g.selector&&(!n||n.test(g.namespace))&&!m.elem.disabled){h=m.elem,d=null;if(g.preType==="mouseenter"||g.preType==="mouseleave")a.type=g.preType,d=f(a.relatedTarget).closest(g.selector)[0],d&&f.contains(h,d)&&(d=h);(!d||d!==h)&&p.push({elem:h,handleObj:g,level:m.level})}}}for(j=0,k=p.length;j<k;j++){e=p[j];if(c&&e.level>c)break;a.currentTarget=e.elem,a.data=e.handleObj.data,a.handleObj=e.handleObj,o=e.handleObj.origHandler.apply(e.elem,arguments);if(o===!1||a.isPropagationStopped()){c=e.level,o===!1&&(b=!1);if(a.isImmediatePropagationStopped())break}}return b}}function K(a,c,d){var e=f.extend({},d[0]);e.type=a,e.originalEvent={},e.liveFired=b,f.event.handle.call(c,e),e.isDefaultPrevented()&&d[0].preventDefault()}function E(){return!0}function D(){return!1}function m(a,c,d){var e=c+"defer",g=c+"queue",h=c+"mark",i=f.data(a,e,b,!0);i&&(d==="queue"||!f.data(a,g,b,!0))&&(d==="mark"||!f.data(a,h,b,!0))&&setTimeout(function(){!f.data(a,g,b,!0)&&!f.data(a,h,b,!0)&&(f.removeData(a,e,!0),i.resolve())},0)}function l(a){for(var b in a)if(b!=="toJSON")return!1;return!0}function k(a,c,d){if(d===b&&a.nodeType===1){var e="data-"+c.replace(j,"$1-$2").toLowerCase();d=a.getAttribute(e);if(typeof d=="string"){try{d=d==="true"?!0:d==="false"?!1:d==="null"?null:f.isNaN(d)?i.test(d)?f.parseJSON(d):d:parseFloat(d)}catch(g){}f.data(a,c,d)}else d=b}return d}var c=a.document,d=a.navigator,e=a.location,f=function(){function J(){if(!e.isReady){try{c.documentElement.doScroll("left")}catch(a){setTimeout(J,1);return}e.ready()}}var e=function(a,b){return new e.fn.init(a,b,h)},f=a.jQuery,g=a.$,h,i=/^(?:[^<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,j=/\S/,k=/^\s+/,l=/\s+$/,m=/\d/,n=/^<(\w+)\s*\/?>(?:<\/\1>)?$/,o=/^[\],:{}\s]*$/,p=/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,q=/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,r=/(?:^|:|,)(?:\s*\[)+/g,s=/(webkit)[ \/]([\w.]+)/,t=/(opera)(?:.*version)?[ \/]([\w.]+)/,u=/(msie) ([\w.]+)/,v=/(mozilla)(?:.*? rv:([\w.]+))?/,w=/-([a-z])/ig,x=function(a,b){return b.toUpperCase()},y=d.userAgent,z,A,B,C=Object.prototype.toString,D=Object.prototype.hasOwnProperty,E=Array.prototype.push,F=Array.prototype.slice,G=String.prototype.trim,H=Array.prototype.indexOf,I={};e.fn=e.prototype={constructor:e,init:function(a,d,f){var g,h,j,k;if(!a)return this;if(a.nodeType){this.context=this[0]=a,this.length=1;return this}if(a==="body"&&!d&&c.body){this.context=c,this[0]=c.body,this.selector=a,this.length=1;return this}if(typeof a=="string"){a.charAt(0)!=="<"||a.charAt(a.length-1)!==">"||a.length<3?g=i.exec(a):g=[null,a,null];if(g&&(g[1]||!d)){if(g[1]){d=d instanceof e?d[0]:d,k=d?d.ownerDocument||d:c,j=n.exec(a),j?e.isPlainObject(d)?(a=[c.createElement(j[1])],e.fn.attr.call(a,d,!0)):a=[k.createElement(j[1])]:(j=e.buildFragment([g[1]],[k]),a=(j.cacheable?e.clone(j.fragment):j.fragment).childNodes);return e.merge(this,a)}h=c.getElementById(g[2]);if(h&&h.parentNode){if(h.id!==g[2])return f.find(a);this.length=1,this[0]=h}this.context=c,this.selector=a;return this}return!d||d.jquery?(d||f).find(a):this.constructor(d).find(a)}if(e.isFunction(a))return f.ready(a);a.selector!==b&&(this.selector=a.selector,this.context=a.context);return e.makeArray(a,this)},selector:"",jquery:"1.6.2",length:0,size:function(){return this.length},toArray:function(){return F.call(this,0)},get:function(a){return a==null?this.toArray():a<0?this[this.length+a]:this[a]},pushStack:function(a,b,c){var d=this.constructor();e.isArray(a)?E.apply(d,a):e.merge(d,a),d.prevObject=this,d.context=this.context,b==="find"?d.selector=this.selector+(this.selector?" ":"")+c:b&&(d.selector=this.selector+"."+b+"("+c+")");return d},each:function(a,b){return e.each(this,a,b)},ready:function(a){e.bindReady(),A.done(a);return this},eq:function(a){return a===-1?this.slice(a):this.slice(a,+a+1)},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},slice:function(){return this.pushStack(F.apply(this,arguments),"slice",F.call(arguments).join(","))},map:function(a){return this.pushStack(e.map(this,function(b,c){return a.call(b,c,b)}))},end:function(){return this.prevObject||this.constructor(null)},push:E,sort:[].sort,splice:[].splice},e.fn.init.prototype=e.fn,e.extend=e.fn.extend=function(){var a,c,d,f,g,h,i=arguments[0]||{},j=1,k=arguments.length,l=!1;typeof i=="boolean"&&(l=i,i=arguments[1]||{},j=2),typeof i!="object"&&!e.isFunction(i)&&(i={}),k===j&&(i=this,--j);for(;j<k;j++)if((a=arguments[j])!=null)for(c in a){d=i[c],f=a[c];if(i===f)continue;l&&f&&(e.isPlainObject(f)||(g=e.isArray(f)))?(g?(g=!1,h=d&&e.isArray(d)?d:[]):h=d&&e.isPlainObject(d)?d:{},i[c]=e.extend(l,h,f)):f!==b&&(i[c]=f)}return i},e.extend({noConflict:function(b){a.$===e&&(a.$=g),b&&a.jQuery===e&&(a.jQuery=f);return e},isReady:!1,readyWait:1,holdReady:function(a){a?e.readyWait++:e.ready(!0)},ready:function(a){if(a===!0&&!--e.readyWait||a!==!0&&!e.isReady){if(!c.body)return setTimeout(e.ready,1);e.isReady=!0;if(a!==!0&&--e.readyWait>0)return;A.resolveWith(c,[e]),e.fn.trigger&&e(c).trigger("ready").unbind("ready")}},bindReady:function(){if(!A){A=e._Deferred();if(c.readyState==="complete")return setTimeout(e.ready,1);if(c.addEventListener)c.addEventListener("DOMContentLoaded",B,!1),a.addEventListener("load",e.ready,!1);else if(c.attachEvent){c.attachEvent("onreadystatechange",B),a.attachEvent("onload",e.ready);var b=!1;try{b=a.frameElement==null}catch(d){}c.documentElement.doScroll&&b&&J()}}},isFunction:function(a){return e.type(a)==="function"},isArray:Array.isArray||function(a){return e.type(a)==="array"},isWindow:function(a){return a&&typeof a=="object"&&"setInterval"in a},isNaN:function(a){return a==null||!m.test(a)||isNaN(a)},type:function(a){return a==null?String(a):I[C.call(a)]||"object"},isPlainObject:function(a){if(!a||e.type(a)!=="object"||a.nodeType||e.isWindow(a))return!1;if(a.constructor&&!D.call(a,"constructor")&&!D.call(a.constructor.prototype,"isPrototypeOf"))return!1;var c;for(c in a);return c===b||D.call(a,c)},isEmptyObject:function(a){for(var b in a)return!1;return!0},error:function(a){throw a},parseJSON:function(b){if(typeof b!="string"||!b)return null;b=e.trim(b);if(a.JSON&&a.JSON.parse)return a.JSON.parse(b);if(o.test(b.replace(p,"@").replace(q,"]").replace(r,"")))return(new Function("return "+b))();e.error("Invalid JSON: "+b)},parseXML:function(b,c,d){a.DOMParser?(d=new DOMParser,c=d.parseFromString(b,"text/xml")):(c=new ActiveXObject("Microsoft.XMLDOM"),c.async="false",c.loadXML(b)),d=c.documentElement,(!d||!d.nodeName||d.nodeName==="parsererror")&&e.error("Invalid XML: "+b);return c},noop:function(){},globalEval:function(b){b&&j.test(b)&&(a.execScript||function(b){a.eval.call(a,b)})(b)},camelCase:function(a){return a.replace(w,x)},nodeName:function(a,b){return a.nodeName&&a.nodeName.toUpperCase()===b.toUpperCase()},each:function(a,c,d){var f,g=0,h=a.length,i=h===b||e.isFunction(a);if(d){if(i){for(f in a)if(c.apply(a[f],d)===!1)break}else for(;g<h;)if(c.apply(a[g++],d)===!1)break}else if(i){for(f in a)if(c.call(a[f],f,a[f])===!1)break}else for(;g<h;)if(c.call(a[g],g,a[g++])===!1)break;return a},trim:G?function(a){return a==null?"":G.call(a)}:function(a){return a==null?"":(a+"").replace(k,"").replace(l,"")},makeArray:function(a,b){var c=b||[];if(a!=null){var d=e.type(a);a.length==null||d==="string"||d==="function"||d==="regexp"||e.isWindow(a)?E.call(c,a):e.merge(c,a)}return c},inArray:function(a,b){if(H)return H.call(b,a);for(var c=0,d=b.length;c<d;c++)if(b[c]===a)return c;return-1},merge:function(a,c){var d=a.length,e=0;if(typeof c.length=="number")for(var f=c.length;e<f;e++)a[d++]=c[e];else while(c[e]!==b)a[d++]=c[e++];a.length=d;return a},grep:function(a,b,c){var d=[],e;c=!!c;for(var f=0,g=a.length;f<g;f++)e=!!b(a[f],f),c!==e&&d.push(a[f]);return d},map:function(a,c,d){var f,g,h=[],i=0,j=a.length,k=a instanceof e||j!==b&&typeof j=="number"&&(j>0&&a[0]&&a[j-1]||j===0||e.isArray(a));if(k)for(;i<j;i++)f=c(a[i],i,d),f!=null&&(h[h.length]=f);else for(g in a)f=c(a[g],g,d),f!=null&&(h[h.length]=f);return h.concat.apply([],h)},guid:1,proxy:function(a,c){if(typeof c=="string"){var d=a[c];c=a,a=d}if(!e.isFunction(a))return b;var f=F.call(arguments,2),g=function(){return a.apply(c,f.concat(F.call(arguments)))};g.guid=a.guid=a.guid||g.guid||e.guid++;return g},access:function(a,c,d,f,g,h){var i=a.length;if(typeof c=="object"){for(var j in c)e.access(a,j,c[j],f,g,d);return a}if(d!==b){f=!h&&f&&e.isFunction(d);for(var k=0;k<i;k++)g(a[k],c,f?d.call(a[k],k,g(a[k],c)):d,h);return a}return i?g(a[0],c):b},now:function(){return(new Date).getTime()},uaMatch:function(a){a=a.toLowerCase();var b=s.exec(a)||t.exec(a)||u.exec(a)||a.indexOf("compatible")<0&&v.exec(a)||[];return{browser:b[1]||"",version:b[2]||"0"}},sub:function(){function a(b,c){return new a.fn.init(b,c)}e.extend(!0,a,this),a.superclass=this,a.fn=a.prototype=this(),a.fn.constructor=a,a.sub=this.sub,a.fn.init=function(d,f){f&&f instanceof e&&!(f instanceof a)&&(f=a(f));return e.fn.init.call(this,d,f,b)},a.fn.init.prototype=a.fn;var b=a(c);return a},browser:{}}),e.each("Boolean Number String Function Array Date RegExp Object".split(" "),function(a,b){I["[object "+b+"]"]=b.toLowerCase()}),z=e.uaMatch(y),z.browser&&(e.browser[z.browser]=!0,e.browser.version=z.version),e.browser.webkit&&(e.browser.safari=!0),j.test(" ")&&(k=/^[\s\xA0]+/,l=/[\s\xA0]+$/),h=e(c),c.addEventListener?B=function(){c.removeEventListener("DOMContentLoaded",B,!1),e.ready()}:c.attachEvent&&(B=function(){c.readyState==="complete"&&(c.detachEvent("onreadystatechange",B),e.ready())});return e}(),g="done fail isResolved isRejected promise then always pipe".split(" "),h=[].slice;f.extend({_Deferred:function(){var a=[],b,c,d,e={done:function(){if(!d){var c=arguments,g,h,i,j,k;b&&(k=b,b=0);for(g=0,h=c.length;g<h;g++)i=c[g],j=f.type(i),j==="array"?e.done.apply(e,i):j==="function"&&a.push(i);k&&e.resolveWith(k[0],k[1])}return this},resolveWith:function(e,f){if(!d&&!b&&!c){f=f||[],c=1;try{while(a[0])a.shift().apply(e,f)}finally{b=[e,f],c=0}}return this},resolve:function(){e.resolveWith(this,arguments);return this},isResolved:function(){return!!c||!!b},cancel:function(){d=1,a=[];return this}};return e},Deferred:function(a){var b=f._Deferred(),c=f._Deferred(),d;f.extend(b,{then:function(a,c){b.done(a).fail(c);return this},always:function(){return b.done.apply(b,arguments).fail.apply(this,arguments)},fail:c.done,rejectWith:c.resolveWith,reject:c.resolve,isRejected:c.isResolved,pipe:function(a,c){return f.Deferred(function(d){f.each({done:[a,"resolve"],fail:[c,"reject"]},function(a,c){var e=c[0],g=c[1],h;f.isFunction(e)?b[a](function(){h=e.apply(this,arguments),h&&f.isFunction(h.promise)?h.promise().then(d.resolve,d.reject):d[g](h)}):b[a](d[g])})}).promise()},promise:function(a){if(a==null){if(d)return d;d=a={}}var c=g.length;while(c--)a[g[c]]=b[g[c]];return a}}),b.done(c.cancel).fail(b.cancel),delete b.cancel,a&&a.call(b,b);return b},when:function(a){function i(a){return function(c){b[a]=arguments.length>1?h.call(arguments,0):c,--e||g.resolveWith(g,h.call(b,0))}}var b=arguments,c=0,d=b.length,e=d,g=d<=1&&a&&f.isFunction(a.promise)?a:f.Deferred();if(d>1){for(;c<d;c++)b[c]&&f.isFunction(b[c].promise)?b[c].promise().then(i(c),g.reject):--e;e||g.resolveWith(g,b)}else g!==a&&g.resolveWith(g,d?[a]:[]);return g.promise()}}),f.support=function(){var a=c.createElement("div"),b=c.documentElement,d,e,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u;a.setAttribute("className","t"),a.innerHTML="   <link/><table></table><a href='/a' style='top:1px;float:left;opacity:.55;'>a</a><input type='checkbox'/>",d=a.getElementsByTagName("*"),e=a.getElementsByTagName("a")[0];if(!d||!d.length||!e)return{};g=c.createElement("select"),h=g.appendChild(c.createElement("option")),i=a.getElementsByTagName("input")[0],k={leadingWhitespace:a.firstChild.nodeType===3,tbody:!a.getElementsByTagName("tbody").length,htmlSerialize:!!a.getElementsByTagName("link").length,style:/top/.test(e.getAttribute("style")),hrefNormalized:e.getAttribute("href")==="/a",opacity:/^0.55$/.test(e.style.opacity),cssFloat:!!e.style.cssFloat,checkOn:i.value==="on",optSelected:h.selected,getSetAttribute:a.className!=="t",submitBubbles:!0,changeBubbles:!0,focusinBubbles:!1,deleteExpando:!0,noCloneEvent:!0,inlineBlockNeedsLayout:!1,shrinkWrapBlocks:!1,reliableMarginRight:!0},i.checked=!0,k.noCloneChecked=i.cloneNode(!0).checked,g.disabled=!0,k.optDisabled=!h.disabled;try{delete a.test}catch(v){k.deleteExpando=!1}!a.addEventListener&&a.attachEvent&&a.fireEvent&&(a.attachEvent("onclick",function(){k.noCloneEvent=!1}),a.cloneNode(!0).fireEvent("onclick")),i=c.createElement("input"),i.value="t",i.setAttribute("type","radio"),k.radioValue=i.value==="t",i.setAttribute("checked","checked"),a.appendChild(i),l=c.createDocumentFragment(),l.appendChild(a.firstChild),k.checkClone=l.cloneNode(!0).cloneNode(!0).lastChild.checked,a.innerHTML="",a.style.width=a.style.paddingLeft="1px",m=c.getElementsByTagName("body")[0],o=c.createElement(m?"div":"body"),p={visibility:"hidden",width:0,height:0,border:0,margin:0},m&&f.extend(p,{position:"absolute",left:-1e3,top:-1e3});for(t in p)o.style[t]=p[t];o.appendChild(a),n=m||b,n.insertBefore(o,n.firstChild),k.appendChecked=i.checked,k.boxModel=a.offsetWidth===2,"zoom"in a.style&&(a.style.display="inline",a.style.zoom=1,k.inlineBlockNeedsLayout=a.offsetWidth===2,a.style.display="",a.innerHTML="<div style='width:4px;'></div>",k.shrinkWrapBlocks=a.offsetWidth!==2),a.innerHTML="<table><tr><td style='padding:0;border:0;display:none'></td><td>t</td></tr></table>",q=a.getElementsByTagName("td"),u=q[0].offsetHeight===0,q[0].style.display="",q[1].style.display="none",k.reliableHiddenOffsets=u&&q[0].offsetHeight===0,a.innerHTML="",c.defaultView&&c.defaultView.getComputedStyle&&(j=c.createElement("div"),j.style.width="0",j.style.marginRight="0",a.appendChild(j),k.reliableMarginRight=(parseInt((c.defaultView.getComputedStyle(j,null)||{marginRight:0}).marginRight,10)||0)===0),o.innerHTML="",n.removeChild(o);if(a.attachEvent)for(t in{submit:1,change:1,focusin:1})s="on"+t,u=s in a,u||(a.setAttribute(s,"return;"),u=typeof a[s]=="function"),k[t+"Bubbles"]=u;o=l=g=h=m=j=a=i=null;return k}(),f.boxModel=f.support.boxModel;var i=/^(?:\{.*\}|\[.*\])$/,j=/([a-z])([A-Z])/g;f.extend({cache:{},uuid:0,expando:"jQuery"+(f.fn.jquery+Math.random()).replace(/\D/g,""),noData:{embed:!0,object:"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",applet:!0},hasData:function(a){a=a.nodeType?f.cache[a[f.expando]]:a[f.expando];return!!a&&!l(a)},data:function(a,c,d,e){if(!!f.acceptData(a)){var g=f.expando,h=typeof c=="string",i,j=a.nodeType,k=j?f.cache:a,l=j?a[f.expando]:a[f.expando]&&f.expando;if((!l||e&&l&&!k[l][g])&&h&&d===b)return;l||(j?a[f.expando]=l=++f.uuid:l=f.expando),k[l]||(k[l]={},j||(k[l].toJSON=f.noop));if(typeof c=="object"||typeof c=="function")e?k[l][g]=f.extend(k[l][g],c):k[l]=f.extend(k[l],c);i=k[l],e&&(i[g]||(i[g]={}),i=i[g]),d!==b&&(i[f.camelCase(c)]=d);if(c==="events"&&!i[c])return i[g]&&i[g].events;return h?i[f.camelCase(c)]||i[c]:i}},removeData:function(b,c,d){if(!!f.acceptData(b)){var e=f.expando,g=b.nodeType,h=g?f.cache:b,i=g?b[f.expando]:f.expando;if(!h[i])return;if(c){var j=d?h[i][e]:h[i];if(j){delete j[c];if(!l(j))return}}if(d){delete h[i][e];if(!l(h[i]))return}var k=h[i][e];f.support.deleteExpando||h!=a?delete h[i]:h[i]=null,k?(h[i]={},g||(h[i].toJSON=f.noop),h[i][e]=k):g&&(f.support.deleteExpando?delete b[f.expando]:b.removeAttribute?b.removeAttribute(f.expando):b[f.expando]=null)}},_data:function(a,b,c){return f.data(a,b,c,!0)},acceptData:function(a){if(a.nodeName){var b=f.noData[a.nodeName.toLowerCase()];if(b)return b!==!0&&a.getAttribute("classid")===b}return!0}}),f.fn.extend({data:function(a,c){var d=null;if(typeof a=="undefined"){if(this.length){d=f.data(this[0]);if(this[0].nodeType===1){var e=this[0].attributes,g;for(var h=0,i=e.length;h<i;h++)g=e[h].name,g.indexOf("data-")===0&&(g=f.camelCase(g.substring(5)),k(this[0],g,d[g]))}}return d}if(typeof a=="object")return this.each(function(){f.data(this,a)});var j=a.split(".");j[1]=j[1]?"."+j[1]:"";if(c===b){d=this.triggerHandler("getData"+j[1]+"!",[j[0]]),d===b&&this.length&&(d=f.data(this[0],a),d=k(this[0],a,d));return d===b&&j[1]?this.data(j[0]):d}return this.each(function(){var b=f(this),d=[j[0],c];b.triggerHandler("setData"+j[1]+"!",d),f.data(this,a,c),b.triggerHandler("changeData"+j[1]+"!",d)})},removeData:function(a){return this.each(function(){f.removeData(this,a)})}}),f.extend({_mark:function(a,c){a&&(c=(c||"fx")+"mark",f.data(a,c,(f.data(a,c,b,!0)||0)+1,!0))},_unmark:function(a,c,d){a!==!0&&(d=c,c=a,a=!1);if(c){d=d||"fx";var e=d+"mark",g=a?0:(f.data(c,e,b,!0)||1)-1;g?f.data(c,e,g,!0):(f.removeData(c,e,!0),m(c,d,"mark"))}},queue:function(a,c,d){if(a){c=(c||"fx")+"queue";var e=f.data(a,c,b,!0);d&&(!e||f.isArray(d)?e=f.data(a,c,f.makeArray(d),!0):e.push(d));return e||[]}},dequeue:function(a,b){b=b||"fx";var c=f.queue(a,b),d=c.shift(),e;d==="inprogress"&&(d=c.shift()),d&&(b==="fx"&&c.unshift("inprogress"),d.call(a,function(){f.dequeue(a,b)})),c.length||(f.removeData(a,b+"queue",!0),m(a,b,"queue"))}}),f.fn.extend({queue:function(a,c){typeof a!="string"&&(c=a,a="fx");if(c===b)return f.queue(this[0],a);return this.each(function(){var b=f.queue(this,a,c);a==="fx"&&b[0]!=="inprogress"&&f.dequeue(this,a)})},dequeue:function(a){return this.each(function(){f.dequeue(this,a)})},delay:function(a,b){a=f.fx?f.fx.speeds[a]||a:a,b=b||"fx";return this.queue(b,function(){var c=this;setTimeout(function(){f.dequeue(c,b)},a)})},clearQueue:function(a){return this.queue(a||"fx",[])},promise:function(a,c){function m(){--h||d.resolveWith(e,[e])}typeof a!="string"&&(c=a,a=b),a=a||"fx";var d=f.Deferred(),e=this,g=e.length,h=1,i=a+"defer",j=a+"queue",k=a+"mark",l;while(g--)if(l=f.data(e[g],i,b,!0)||(f.data(e[g],j,b,!0)||f.data(e[g],k,b,!0))&&f.data(e[g],i,f._Deferred(),!0))h++,l.done(m);m();return d.promise()}});var n=/[\n\t\r]/g,o=/\s+/,p=/\r/g,q=/^(?:button|input)$/i,r=/^(?:button|input|object|select|textarea)$/i,s=/^a(?:rea)?$/i,t=/^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,u=/\:|^on/,v,w;f.fn.extend({attr:function(a,b){return f.access(this,a,b,!0,f.attr)},removeAttr:function(a){return this.each(function(){f.removeAttr(this,a)})},prop:function(a,b){return f.access(this,a,b,!0,f.prop)},removeProp:function(a){a=f.propFix[a]||a;return this.each(function(){try{this[a]=b,delete this[a]}catch(c){}})},addClass:function(a){var b,c,d,e,g,h,i;if(f.isFunction(a))return this.each(function(b){f(this).addClass(a.call(this,b,this.className))});if(a&&typeof a=="string"){b=a.split(o);for(c=0,d=this.length;c<d;c++){e=this[c];if(e.nodeType===1)if(!e.className&&b.length===1)e.className=a;else{g=" "+e.className+" ";for(h=0,i=b.length;h<i;h++)~g.indexOf(" "+b[h]+" ")||(g+=b[h]+" ");e.className=f.trim(g)}}}return this},removeClass:function(a){var c,d,e,g,h,i,j;if(f.isFunction(a))return this.each(function(b){f(this).removeClass(a.call(this,b,this.className))});if(a&&typeof a=="string"||a===b){c=(a||"").split(o);for(d=0,e=this.length;d<e;d++){g=this[d];if(g.nodeType===1&&g.className)if(a){h=(" "+g.className+" ").replace(n," ");for(i=0,j=c.length;i<j;i++)h=h.replace(" "+c[i]+" "," ");g.className=f.trim(h)}else g.className=""}}return this},toggleClass:function(a,b){var c=typeof a,d=typeof b=="boolean";if(f.isFunction(a))return this.each(function(c){f(this).toggleClass(a.call(this,c,this.className,b),b)});return this.each(function(){if(c==="string"){var e,g=0,h=f(this),i=b,j=a.split(o);while(e=j[g++])i=d?i:!h.hasClass(e),h[i?"addClass":"removeClass"](e)}else if(c==="undefined"||c==="boolean")this.className&&f._data(this,"__className__",this.className),this.className=this.className||a===!1?"":f._data(this,"__className__")||""})},hasClass:function(a){var b=" "+a+" ";for(var c=0,d=this.length;c<d;c++)if((" "+this[c].className+" ").replace(n," ").indexOf(b)>-1)return!0;return!1},val:function(a){var c,d,e=this[0];if(!arguments.length){if(e){c=f.valHooks[e.nodeName.toLowerCase()]||f.valHooks[e.type];if(c&&"get"in c&&(d=c.get(e,"value"))!==b)return d;d=e.value;return typeof d=="string"?d.replace(p,""):d==null?"":d}return b}var g=f.isFunction(a);return this.each(function(d){var e=f(this),h;if(this.nodeType===1){g?h=a.call(this,d,e.val()):h=a,h==null?h="":typeof h=="number"?h+="":f.isArray(h)&&(h=f.map(h,function(a){return a==null?"":a+""})),c=f.valHooks[this.nodeName.toLowerCase()]||f.valHooks[this.type];if(!c||!("set"in c)||c.set(this,h,"value")===b)this.value=h}})}}),f.extend({valHooks:{option:{get:function(a){var b=a.attributes.value;return!b||b.specified?a.value:a.text}},select:{get:function(a){var b,c=a.selectedIndex,d=[],e=a.options,g=a.type==="select-one";if(c<0)return null;for(var h=g?c:0,i=g?c+1:e.length;h<i;h++){var j=e[h];if(j.selected&&(f.support.optDisabled?!j.disabled:j.getAttribute("disabled")===null)&&(!j.parentNode.disabled||!f.nodeName(j.parentNode,"optgroup"))){b=f(j).val();if(g)return b;d.push(b)}}if(g&&!d.length&&e.length)return f(e[c]).val();return d},set:function(a,b){var c=f.makeArray(b);f(a).find("option").each(function(){this.selected=f.inArray(f(this).val(),c)>=0}),c.length||(a.selectedIndex=-1);return c}}},attrFn:{val:!0,css:!0,html:!0,text:!0,data:!0,width:!0,height:!0,offset:!0},attrFix:{tabindex:"tabIndex"},attr:function(a,c,d,e){var g=a.nodeType;if(!a||g===3||g===8||g===2)return b;if(e&&c in f.attrFn)return f(a)[c](d);if(!("getAttribute"in a))return f.prop(a,c,d);var h,i,j=g!==1||!f.isXMLDoc(a);j&&(c=f.attrFix[c]||c,i=f.attrHooks[c],i||(t.test(c)?i=w:v&&c!=="className"&&(f.nodeName(a,"form")||u.test(c))&&(i=v)));if(d!==b){if(d===null){f.removeAttr(a,c);return b}if(i&&"set"in i&&j&&(h=i.set(a,d,c))!==b)return h;a.setAttribute(c,""+d);return d}if(i&&"get"in i&&j&&(h=i.get(a,c))!==null)return h;h=a.getAttribute(c);return h===null?b:h},removeAttr:function(a,b){var c;a.nodeType===1&&(b=f.attrFix[b]||b,f.support.getSetAttribute?a.removeAttribute(b):(f.attr(a,b,""),a.removeAttributeNode(a.getAttributeNode(b))),t.test(b)&&(c=f.propFix[b]||b)in a&&(a[c]=!1))},attrHooks:{type:{set:function(a,b){if(q.test(a.nodeName)&&a.parentNode)f.error("type property can't be changed");else if(!f.support.radioValue&&b==="radio"&&f.nodeName(a,"input")){var c=a.value;a.setAttribute("type",b),c&&(a.value=c);return b}}},tabIndex:{get:function(a){var c=a.getAttributeNode("tabIndex");return c&&c.specified?parseInt(c.value,10):r.test(a.nodeName)||s.test(a.nodeName)&&a.href?0:b}},value:{get:function(a,b){if(v&&f.nodeName(a,"button"))return v.get(a,b);return b in a?a.value:null},set:function(a,b,c){if(v&&f.nodeName(a,"button"))return v.set(a,b,c);a.value=b}}},propFix:{tabindex:"tabIndex",readonly:"readOnly","for":"htmlFor","class":"className",maxlength:"maxLength",cellspacing:"cellSpacing",cellpadding:"cellPadding",rowspan:"rowSpan",colspan:"colSpan",usemap:"useMap",frameborder:"frameBorder",contenteditable:"contentEditable"},prop:function(a,c,d){var e=a.nodeType;if(!a||e===3||e===8||e===2)return b;var g,h,i=e!==1||!f.isXMLDoc(a);i&&(c=f.propFix[c]||c,h=f.propHooks[c]);return d!==b?h&&"set"in h&&(g=h.set(a,d,c))!==b?g:a[c]=d:h&&"get"in h&&(g=h.get(a,c))!==b?g:a[c]},propHooks:{}}),w={get:function(a,c){return f.prop(a,c)?c.toLowerCase():b},set:function(a,b,c){var d;b===!1?f.removeAttr(a,c):(d=f.propFix[c]||c,d in a&&(a[d]=!0),a.setAttribute(c,c.toLowerCase()));return c}},f.support.getSetAttribute||(f.attrFix=f.propFix,v=f.attrHooks.name=f.attrHooks.title=f.valHooks.button={get:function(a,c){var d;d=a.getAttributeNode(c);return d&&d.nodeValue!==""?d.nodeValue:b},set:function(a,b,c){var d=a.getAttributeNode(c);if(d){d.nodeValue=b;return b}}},f.each(["width","height"],function(a,b){f.attrHooks[b]=f.extend(f.attrHooks[b],{set:function(a,c){if(c===""){a.setAttribute(b,"auto");return c}}})})),f.support.hrefNormalized||f.each(["href","src","width","height"],function(a,c){f.attrHooks[c]=f.extend(f.attrHooks[c],{get:function(a){var d=a.getAttribute(c,2);return d===null?b:d}})}),f.support.style||(f.attrHooks.style={get:function(a){return a.style.cssText.toLowerCase()||b},set:function(a,b){return a.style.cssText=""+b}}),f.support.optSelected||(f.propHooks.selected=f.extend(f.propHooks.selected,{get:function(a){var b=a.parentNode;b&&(b.selectedIndex,b.parentNode&&b.parentNode.selectedIndex)}})),f.support.checkOn||f.each(["radio","checkbox"],function(){f.valHooks[this]={get:function(a){return a.getAttribute("value")===null?"on":a.value}}}),f.each(["radio","checkbox"],function(){f.valHooks[this]=f.extend(f.valHooks[this],{set:function(a,b){if(f.isArray(b))return a.checked=f.inArray(f(a).val(),b)>=0}})});var x=/\.(.*)$/,y=/^(?:textarea|input|select)$/i,z=/\./g,A=/ /g,B=/[^\w\s.|`]/g,C=function(a){return a.replace(B,"\\$&")};f.event={add:function(a,c,d,e){if(a.nodeType!==3&&a.nodeType!==8){if(d===!1)d=D;else if(!d)return;var g,h;d.handler&&(g=d,d=g.handler),d.guid||(d.guid=f.guid++);var i=f._data(a);if(!i)return;var j=i.events,k=i.handle;j||(i.events=j={}),k||(i.handle=k=function(a){return typeof f!="undefined"&&(!a||f.event.triggered!==a.type)?f.event.handle.apply(k.elem,arguments):b}),k.elem=a,c=c.split(" ");var l,m=0,n;while(l=c[m++]){h=g?f.extend({},g):{handler:d,data:e},l.indexOf(".")>-1?(n=l.split("."),l=n.shift(),h.namespace=n.slice(0).sort().join(".")):(n=[],h.namespace=""),h.type=l,h.guid||(h.guid=d.guid);var o=j[l],p=f.event.special[l]||{};if(!o){o=j[l]=[];if(!p.setup||p.setup.call(a,e,n,k)===!1)a.addEventListener?a.addEventListener(l,k,!1):a.attachEvent&&a.attachEvent("on"+l,k)}p.add&&(p.add.call(a,h),h.handler.guid||(h.handler.guid=d.guid)),o.push(h),f.event.global[l]=!0}a=null}},global:{},remove:function(a,c,d,e){if(a.nodeType!==3&&a.nodeType!==8){d===!1&&(d=D);var g,h,i,j,k=0,l,m,n,o,p,q,r,s=f.hasData(a)&&f._data(a),t=s&&s.events;if(!s||!t)return;c&&c.type&&(d=c.handler,c=c.type);if(!c||typeof c=="string"&&c.charAt(0)==="."){c=c||"";for(h in t)f.event.remove(a,h+c);return}c=c.split(" ");while(h=c[k++]){r=h,q=null,l=h.indexOf(".")<0,m=[],l||(m=h.split("."),h=m.shift(),n=new RegExp("(^|\\.)"+f.map(m.slice(0).sort(),C).join("\\.(?:.*\\.)?")+"(\\.|$)")),p=t[h];if(!p)continue;if(!d){for(j=0;j<p.length;j++){q=p[j];if(l||n.test(q.namespace))f.event.remove(a,r,q.handler,j),p.splice(j--,1)}continue}o=f.event.special[h]||{};for(j=e||0;j<p.length;j++){q=p[j];if(d.guid===q.guid){if(l||n.test(q.namespace))e==null&&p.splice(j--,1),o.remove&&o.remove.call(a,q);if(e!=null)break}}if(p.length===0||e!=null&&p.length===1)(!o.teardown||o.teardown.call(a,m)===!1)&&f.removeEvent(a,h,s.handle),g=null,delete t[h]}if(f.isEmptyObject(t)){var u=s.handle;u&&(u.elem=null),delete s.events,delete s.handle,f.isEmptyObject(s)&&f.removeData(a,b,!0)}}},customEvent:{getData:!0,setData:!0,changeData:!0},trigger:function(c,d,e,g){var h=c.type||c,i=[],j;h.indexOf("!")>=0&&(h=h.slice(0,-1),j=!0),h.indexOf(".")>=0&&(i=h.split("."),h=i.
shift(),i.sort());if(!!e&&!f.event.customEvent[h]||!!f.event.global[h]){c=typeof c=="object"?c[f.expando]?c:new f.Event(h,c):new f.Event(h),c.type=h,c.exclusive=j,c.namespace=i.join("."),c.namespace_re=new RegExp("(^|\\.)"+i.join("\\.(?:.*\\.)?")+"(\\.|$)");if(g||!e)c.preventDefault(),c.stopPropagation();if(!e){f.each(f.cache,function(){var a=f.expando,b=this[a];b&&b.events&&b.events[h]&&f.event.trigger(c,d,b.handle.elem)});return}if(e.nodeType===3||e.nodeType===8)return;c.result=b,c.target=e,d=d!=null?f.makeArray(d):[],d.unshift(c);var k=e,l=h.indexOf(":")<0?"on"+h:"";do{var m=f._data(k,"handle");c.currentTarget=k,m&&m.apply(k,d),l&&f.acceptData(k)&&k[l]&&k[l].apply(k,d)===!1&&(c.result=!1,c.preventDefault()),k=k.parentNode||k.ownerDocument||k===c.target.ownerDocument&&a}while(k&&!c.isPropagationStopped());if(!c.isDefaultPrevented()){var n,o=f.event.special[h]||{};if((!o._default||o._default.call(e.ownerDocument,c)===!1)&&(h!=="click"||!f.nodeName(e,"a"))&&f.acceptData(e)){try{l&&e[h]&&(n=e[l],n&&(e[l]=null),f.event.triggered=h,e[h]())}catch(p){}n&&(e[l]=n),f.event.triggered=b}}return c.result}},handle:function(c){c=f.event.fix(c||a.event);var d=((f._data(this,"events")||{})[c.type]||[]).slice(0),e=!c.exclusive&&!c.namespace,g=Array.prototype.slice.call(arguments,0);g[0]=c,c.currentTarget=this;for(var h=0,i=d.length;h<i;h++){var j=d[h];if(e||c.namespace_re.test(j.namespace)){c.handler=j.handler,c.data=j.data,c.handleObj=j;var k=j.handler.apply(this,g);k!==b&&(c.result=k,k===!1&&(c.preventDefault(),c.stopPropagation()));if(c.isImmediatePropagationStopped())break}}return c.result},props:"altKey attrChange attrName bubbles button cancelable charCode clientX clientY ctrlKey currentTarget data detail eventPhase fromElement handler keyCode layerX layerY metaKey newValue offsetX offsetY pageX pageY prevValue relatedNode relatedTarget screenX screenY shiftKey srcElement target toElement view wheelDelta which".split(" "),fix:function(a){if(a[f.expando])return a;var d=a;a=f.Event(d);for(var e=this.props.length,g;e;)g=this.props[--e],a[g]=d[g];a.target||(a.target=a.srcElement||c),a.target.nodeType===3&&(a.target=a.target.parentNode),!a.relatedTarget&&a.fromElement&&(a.relatedTarget=a.fromElement===a.target?a.toElement:a.fromElement);if(a.pageX==null&&a.clientX!=null){var h=a.target.ownerDocument||c,i=h.documentElement,j=h.body;a.pageX=a.clientX+(i&&i.scrollLeft||j&&j.scrollLeft||0)-(i&&i.clientLeft||j&&j.clientLeft||0),a.pageY=a.clientY+(i&&i.scrollTop||j&&j.scrollTop||0)-(i&&i.clientTop||j&&j.clientTop||0)}a.which==null&&(a.charCode!=null||a.keyCode!=null)&&(a.which=a.charCode!=null?a.charCode:a.keyCode),!a.metaKey&&a.ctrlKey&&(a.metaKey=a.ctrlKey),!a.which&&a.button!==b&&(a.which=a.button&1?1:a.button&2?3:a.button&4?2:0);return a},guid:1e8,proxy:f.proxy,special:{ready:{setup:f.bindReady,teardown:f.noop},live:{add:function(a){f.event.add(this,N(a.origType,a.selector),f.extend({},a,{handler:M,guid:a.handler.guid}))},remove:function(a){f.event.remove(this,N(a.origType,a.selector),a)}},beforeunload:{setup:function(a,b,c){f.isWindow(this)&&(this.onbeforeunload=c)},teardown:function(a,b){this.onbeforeunload===b&&(this.onbeforeunload=null)}}}},f.removeEvent=c.removeEventListener?function(a,b,c){a.removeEventListener&&a.removeEventListener(b,c,!1)}:function(a,b,c){a.detachEvent&&a.detachEvent("on"+b,c)},f.Event=function(a,b){if(!this.preventDefault)return new f.Event(a,b);a&&a.type?(this.originalEvent=a,this.type=a.type,this.isDefaultPrevented=a.defaultPrevented||a.returnValue===!1||a.getPreventDefault&&a.getPreventDefault()?E:D):this.type=a,b&&f.extend(this,b),this.timeStamp=f.now(),this[f.expando]=!0},f.Event.prototype={preventDefault:function(){this.isDefaultPrevented=E;var a=this.originalEvent;!a||(a.preventDefault?a.preventDefault():a.returnValue=!1)},stopPropagation:function(){this.isPropagationStopped=E;var a=this.originalEvent;!a||(a.stopPropagation&&a.stopPropagation(),a.cancelBubble=!0)},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=E,this.stopPropagation()},isDefaultPrevented:D,isPropagationStopped:D,isImmediatePropagationStopped:D};var F=function(a){var b=a.relatedTarget,c=!1,d=a.type;a.type=a.data,b!==this&&(b&&(c=f.contains(this,b)),c||(f.event.handle.apply(this,arguments),a.type=d))},G=function(a){a.type=a.data,f.event.handle.apply(this,arguments)};f.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(a,b){f.event.special[a]={setup:function(c){f.event.add(this,b,c&&c.selector?G:F,a)},teardown:function(a){f.event.remove(this,b,a&&a.selector?G:F)}}}),f.support.submitBubbles||(f.event.special.submit={setup:function(a,b){if(!f.nodeName(this,"form"))f.event.add(this,"click.specialSubmit",function(a){var b=a.target,c=b.type;(c==="submit"||c==="image")&&f(b).closest("form").length&&K("submit",this,arguments)}),f.event.add(this,"keypress.specialSubmit",function(a){var b=a.target,c=b.type;(c==="text"||c==="password")&&f(b).closest("form").length&&a.keyCode===13&&K("submit",this,arguments)});else return!1},teardown:function(a){f.event.remove(this,".specialSubmit")}});if(!f.support.changeBubbles){var H,I=function(a){var b=a.type,c=a.value;b==="radio"||b==="checkbox"?c=a.checked:b==="select-multiple"?c=a.selectedIndex>-1?f.map(a.options,function(a){return a.selected}).join("-"):"":f.nodeName(a,"select")&&(c=a.selectedIndex);return c},J=function(c){var d=c.target,e,g;if(!!y.test(d.nodeName)&&!d.readOnly){e=f._data(d,"_change_data"),g=I(d),(c.type!=="focusout"||d.type!=="radio")&&f._data(d,"_change_data",g);if(e===b||g===e)return;if(e!=null||g)c.type="change",c.liveFired=b,f.event.trigger(c,arguments[1],d)}};f.event.special.change={filters:{focusout:J,beforedeactivate:J,click:function(a){var b=a.target,c=f.nodeName(b,"input")?b.type:"";(c==="radio"||c==="checkbox"||f.nodeName(b,"select"))&&J.call(this,a)},keydown:function(a){var b=a.target,c=f.nodeName(b,"input")?b.type:"";(a.keyCode===13&&!f.nodeName(b,"textarea")||a.keyCode===32&&(c==="checkbox"||c==="radio")||c==="select-multiple")&&J.call(this,a)},beforeactivate:function(a){var b=a.target;f._data(b,"_change_data",I(b))}},setup:function(a,b){if(this.type==="file")return!1;for(var c in H)f.event.add(this,c+".specialChange",H[c]);return y.test(this.nodeName)},teardown:function(a){f.event.remove(this,".specialChange");return y.test(this.nodeName)}},H=f.event.special.change.filters,H.focus=H.beforeactivate}f.support.focusinBubbles||f.each({focus:"focusin",blur:"focusout"},function(a,b){function e(a){var c=f.event.fix(a);c.type=b,c.originalEvent={},f.event.trigger(c,null,c.target),c.isDefaultPrevented()&&a.preventDefault()}var d=0;f.event.special[b]={setup:function(){d++===0&&c.addEventListener(a,e,!0)},teardown:function(){--d===0&&c.removeEventListener(a,e,!0)}}}),f.each(["bind","one"],function(a,c){f.fn[c]=function(a,d,e){var g;if(typeof a=="object"){for(var h in a)this[c](h,d,a[h],e);return this}if(arguments.length===2||d===!1)e=d,d=b;c==="one"?(g=function(a){f(this).unbind(a,g);return e.apply(this,arguments)},g.guid=e.guid||f.guid++):g=e;if(a==="unload"&&c!=="one")this.one(a,d,e);else for(var i=0,j=this.length;i<j;i++)f.event.add(this[i],a,g,d);return this}}),f.fn.extend({unbind:function(a,b){if(typeof a=="object"&&!a.preventDefault)for(var c in a)this.unbind(c,a[c]);else for(var d=0,e=this.length;d<e;d++)f.event.remove(this[d],a,b);return this},delegate:function(a,b,c,d){return this.live(b,c,d,a)},undelegate:function(a,b,c){return arguments.length===0?this.unbind("live"):this.die(b,null,c,a)},trigger:function(a,b){return this.each(function(){f.event.trigger(a,b,this)})},triggerHandler:function(a,b){if(this[0])return f.event.trigger(a,b,this[0],!0)},toggle:function(a){var b=arguments,c=a.guid||f.guid++,d=0,e=function(c){var e=(f.data(this,"lastToggle"+a.guid)||0)%d;f.data(this,"lastToggle"+a.guid,e+1),c.preventDefault();return b[e].apply(this,arguments)||!1};e.guid=c;while(d<b.length)b[d++].guid=c;return this.click(e)},hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)}});var L={focus:"focusin",blur:"focusout",mouseenter:"mouseover",mouseleave:"mouseout"};f.each(["live","die"],function(a,c){f.fn[c]=function(a,d,e,g){var h,i=0,j,k,l,m=g||this.selector,n=g?this:f(this.context);if(typeof a=="object"&&!a.preventDefault){for(var o in a)n[c](o,d,a[o],m);return this}if(c==="die"&&!a&&g&&g.charAt(0)==="."){n.unbind(g);return this}if(d===!1||f.isFunction(d))e=d||D,d=b;a=(a||"").split(" ");while((h=a[i++])!=null){j=x.exec(h),k="",j&&(k=j[0],h=h.replace(x,""));if(h==="hover"){a.push("mouseenter"+k,"mouseleave"+k);continue}l=h,L[h]?(a.push(L[h]+k),h=h+k):h=(L[h]||h)+k;if(c==="live")for(var p=0,q=n.length;p<q;p++)f.event.add(n[p],"live."+N(h,m),{data:d,selector:m,handler:e,origType:h,origHandler:e,preType:l});else n.unbind("live."+N(h,m),e)}return this}}),f.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error".split(" "),function(a,b){f.fn[b]=function(a,c){c==null&&(c=a,a=null);return arguments.length>0?this.bind(b,a,c):this.trigger(b)},f.attrFn&&(f.attrFn[b]=!0)}),function(){function u(a,b,c,d,e,f){for(var g=0,h=d.length;g<h;g++){var i=d[g];if(i){var j=!1;i=i[a];while(i){if(i.sizcache===c){j=d[i.sizset];break}if(i.nodeType===1){f||(i.sizcache=c,i.sizset=g);if(typeof b!="string"){if(i===b){j=!0;break}}else if(k.filter(b,[i]).length>0){j=i;break}}i=i[a]}d[g]=j}}}function t(a,b,c,d,e,f){for(var g=0,h=d.length;g<h;g++){var i=d[g];if(i){var j=!1;i=i[a];while(i){if(i.sizcache===c){j=d[i.sizset];break}i.nodeType===1&&!f&&(i.sizcache=c,i.sizset=g);if(i.nodeName.toLowerCase()===b){j=i;break}i=i[a]}d[g]=j}}}var a=/((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,d=0,e=Object.prototype.toString,g=!1,h=!0,i=/\\/g,j=/\W/;[0,0].sort(function(){h=!1;return 0});var k=function(b,d,f,g){f=f||[],d=d||c;var h=d;if(d.nodeType!==1&&d.nodeType!==9)return[];if(!b||typeof b!="string")return f;var i,j,n,o,q,r,s,t,u=!0,w=k.isXML(d),x=[],y=b;do{a.exec(""),i=a.exec(y);if(i){y=i[3],x.push(i[1]);if(i[2]){o=i[3];break}}}while(i);if(x.length>1&&m.exec(b))if(x.length===2&&l.relative[x[0]])j=v(x[0]+x[1],d);else{j=l.relative[x[0]]?[d]:k(x.shift(),d);while(x.length)b=x.shift(),l.relative[b]&&(b+=x.shift()),j=v(b,j)}else{!g&&x.length>1&&d.nodeType===9&&!w&&l.match.ID.test(x[0])&&!l.match.ID.test(x[x.length-1])&&(q=k.find(x.shift(),d,w),d=q.expr?k.filter(q.expr,q.set)[0]:q.set[0]);if(d){q=g?{expr:x.pop(),set:p(g)}:k.find(x.pop(),x.length===1&&(x[0]==="~"||x[0]==="+")&&d.parentNode?d.parentNode:d,w),j=q.expr?k.filter(q.expr,q.set):q.set,x.length>0?n=p(j):u=!1;while(x.length)r=x.pop(),s=r,l.relative[r]?s=x.pop():r="",s==null&&(s=d),l.relative[r](n,s,w)}else n=x=[]}n||(n=j),n||k.error(r||b);if(e.call(n)==="[object Array]")if(!u)f.push.apply(f,n);else if(d&&d.nodeType===1)for(t=0;n[t]!=null;t++)n[t]&&(n[t]===!0||n[t].nodeType===1&&k.contains(d,n[t]))&&f.push(j[t]);else for(t=0;n[t]!=null;t++)n[t]&&n[t].nodeType===1&&f.push(j[t]);else p(n,f);o&&(k(o,h,f,g),k.uniqueSort(f));return f};k.uniqueSort=function(a){if(r){g=h,a.sort(r);if(g)for(var b=1;b<a.length;b++)a[b]===a[b-1]&&a.splice(b--,1)}return a},k.matches=function(a,b){return k(a,null,null,b)},k.matchesSelector=function(a,b){return k(b,null,null,[a]).length>0},k.find=function(a,b,c){var d;if(!a)return[];for(var e=0,f=l.order.length;e<f;e++){var g,h=l.order[e];if(g=l.leftMatch[h].exec(a)){var j=g[1];g.splice(1,1);if(j.substr(j.length-1)!=="\\"){g[1]=(g[1]||"").replace(i,""),d=l.find[h](g,b,c);if(d!=null){a=a.replace(l.match[h],"");break}}}}d||(d=typeof b.getElementsByTagName!="undefined"?b.getElementsByTagName("*"):[]);return{set:d,expr:a}},k.filter=function(a,c,d,e){var f,g,h=a,i=[],j=c,m=c&&c[0]&&k.isXML(c[0]);while(a&&c.length){for(var n in l.filter)if((f=l.leftMatch[n].exec(a))!=null&&f[2]){var o,p,q=l.filter[n],r=f[1];g=!1,f.splice(1,1);if(r.substr(r.length-1)==="\\")continue;j===i&&(i=[]);if(l.preFilter[n]){f=l.preFilter[n](f,j,d,i,e,m);if(!f)g=o=!0;else if(f===!0)continue}if(f)for(var s=0;(p=j[s])!=null;s++)if(p){o=q(p,f,s,j);var t=e^!!o;d&&o!=null?t?g=!0:j[s]=!1:t&&(i.push(p),g=!0)}if(o!==b){d||(j=i),a=a.replace(l.match[n],"");if(!g)return[];break}}if(a===h)if(g==null)k.error(a);else break;h=a}return j},k.error=function(a){throw"Syntax error, unrecognized expression: "+a};var l=k.selectors={order:["ID","NAME","TAG"],match:{ID:/#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,CLASS:/\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,NAME:/\[name=['"]*((?:[\w\u00c0-\uFFFF\-]|\\.)+)['"]*\]/,ATTR:/\[\s*((?:[\w\u00c0-\uFFFF\-]|\\.)+)\s*(?:(\S?=)\s*(?:(['"])(.*?)\3|(#?(?:[\w\u00c0-\uFFFF\-]|\\.)*)|)|)\s*\]/,TAG:/^((?:[\w\u00c0-\uFFFF\*\-]|\\.)+)/,CHILD:/:(only|nth|last|first)-child(?:\(\s*(even|odd|(?:[+\-]?\d+|(?:[+\-]?\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?/,POS:/:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^\-]|$)/,PSEUDO:/:((?:[\w\u00c0-\uFFFF\-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/},leftMatch:{},attrMap:{"class":"className","for":"htmlFor"},attrHandle:{href:function(a){return a.getAttribute("href")},type:function(a){return a.getAttribute("type")}},relative:{"+":function(a,b){var c=typeof b=="string",d=c&&!j.test(b),e=c&&!d;d&&(b=b.toLowerCase());for(var f=0,g=a.length,h;f<g;f++)if(h=a[f]){while((h=h.previousSibling)&&h.nodeType!==1);a[f]=e||h&&h.nodeName.toLowerCase()===b?h||!1:h===b}e&&k.filter(b,a,!0)},">":function(a,b){var c,d=typeof b=="string",e=0,f=a.length;if(d&&!j.test(b)){b=b.toLowerCase();for(;e<f;e++){c=a[e];if(c){var g=c.parentNode;a[e]=g.nodeName.toLowerCase()===b?g:!1}}}else{for(;e<f;e++)c=a[e],c&&(a[e]=d?c.parentNode:c.parentNode===b);d&&k.filter(b,a,!0)}},"":function(a,b,c){var e,f=d++,g=u;typeof b=="string"&&!j.test(b)&&(b=b.toLowerCase(),e=b,g=t),g("parentNode",b,f,a,e,c)},"~":function(a,b,c){var e,f=d++,g=u;typeof b=="string"&&!j.test(b)&&(b=b.toLowerCase(),e=b,g=t),g("previousSibling",b,f,a,e,c)}},find:{ID:function(a,b,c){if(typeof b.getElementById!="undefined"&&!c){var d=b.getElementById(a[1]);return d&&d.parentNode?[d]:[]}},NAME:function(a,b){if(typeof b.getElementsByName!="undefined"){var c=[],d=b.getElementsByName(a[1]);for(var e=0,f=d.length;e<f;e++)d[e].getAttribute("name")===a[1]&&c.push(d[e]);return c.length===0?null:c}},TAG:function(a,b){if(typeof b.getElementsByTagName!="undefined")return b.getElementsByTagName(a[1])}},preFilter:{CLASS:function(a,b,c,d,e,f){a=" "+a[1].replace(i,"")+" ";if(f)return a;for(var g=0,h;(h=b[g])!=null;g++)h&&(e^(h.className&&(" "+h.className+" ").replace(/[\t\n\r]/g," ").indexOf(a)>=0)?c||d.push(h):c&&(b[g]=!1));return!1},ID:function(a){return a[1].replace(i,"")},TAG:function(a,b){return a[1].replace(i,"").toLowerCase()},CHILD:function(a){if(a[1]==="nth"){a[2]||k.error(a[0]),a[2]=a[2].replace(/^\+|\s*/g,"");var b=/(-?)(\d*)(?:n([+\-]?\d*))?/.exec(a[2]==="even"&&"2n"||a[2]==="odd"&&"2n+1"||!/\D/.test(a[2])&&"0n+"+a[2]||a[2]);a[2]=b[1]+(b[2]||1)-0,a[3]=b[3]-0}else a[2]&&k.error(a[0]);a[0]=d++;return a},ATTR:function(a,b,c,d,e,f){var g=a[1]=a[1].replace(i,"");!f&&l.attrMap[g]&&(a[1]=l.attrMap[g]),a[4]=(a[4]||a[5]||"").replace(i,""),a[2]==="~="&&(a[4]=" "+a[4]+" ");return a},PSEUDO:function(b,c,d,e,f){if(b[1]==="not")if((a.exec(b[3])||"").length>1||/^\w/.test(b[3]))b[3]=k(b[3],null,null,c);else{var g=k.filter(b[3],c,d,!0^f);d||e.push.apply(e,g);return!1}else if(l.match.POS.test(b[0])||l.match.CHILD.test(b[0]))return!0;return b},POS:function(a){a.unshift(!0);return a}},filters:{enabled:function(a){return a.disabled===!1&&a.type!=="hidden"},disabled:function(a){return a.disabled===!0},checked:function(a){return a.checked===!0},selected:function(a){a.parentNode&&a.parentNode.selectedIndex;return a.selected===!0},parent:function(a){return!!a.firstChild},empty:function(a){return!a.firstChild},has:function(a,b,c){return!!k(c[3],a).length},header:function(a){return/h\d/i.test(a.nodeName)},text:function(a){var b=a.getAttribute("type"),c=a.type;return a.nodeName.toLowerCase()==="input"&&"text"===c&&(b===c||b===null)},radio:function(a){return a.nodeName.toLowerCase()==="input"&&"radio"===a.type},checkbox:function(a){return a.nodeName.toLowerCase()==="input"&&"checkbox"===a.type},file:function(a){return a.nodeName.toLowerCase()==="input"&&"file"===a.type},password:function(a){return a.nodeName.toLowerCase()==="input"&&"password"===a.type},submit:function(a){var b=a.nodeName.toLowerCase();return(b==="input"||b==="button")&&"submit"===a.type},image:function(a){return a.nodeName.toLowerCase()==="input"&&"image"===a.type},reset:function(a){var b=a.nodeName.toLowerCase();return(b==="input"||b==="button")&&"reset"===a.type},button:function(a){var b=a.nodeName.toLowerCase();return b==="input"&&"button"===a.type||b==="button"},input:function(a){return/input|select|textarea|button/i.test(a.nodeName)},focus:function(a){return a===a.ownerDocument.activeElement}},setFilters:{first:function(a,b){return b===0},last:function(a,b,c,d){return b===d.length-1},even:function(a,b){return b%2===0},odd:function(a,b){return b%2===1},lt:function(a,b,c){return b<c[3]-0},gt:function(a,b,c){return b>c[3]-0},nth:function(a,b,c){return c[3]-0===b},eq:function(a,b,c){return c[3]-0===b}},filter:{PSEUDO:function(a,b,c,d){var e=b[1],f=l.filters[e];if(f)return f(a,c,b,d);if(e==="contains")return(a.textContent||a.innerText||k.getText([a])||"").indexOf(b[3])>=0;if(e==="not"){var g=b[3];for(var h=0,i=g.length;h<i;h++)if(g[h]===a)return!1;return!0}k.error(e)},CHILD:function(a,b){var c=b[1],d=a;switch(c){case"only":case"first":while(d=d.previousSibling)if(d.nodeType===1)return!1;if(c==="first")return!0;d=a;case"last":while(d=d.nextSibling)if(d.nodeType===1)return!1;return!0;case"nth":var e=b[2],f=b[3];if(e===1&&f===0)return!0;var g=b[0],h=a.parentNode;if(h&&(h.sizcache!==g||!a.nodeIndex)){var i=0;for(d=h.firstChild;d;d=d.nextSibling)d.nodeType===1&&(d.nodeIndex=++i);h.sizcache=g}var j=a.nodeIndex-f;return e===0?j===0:j%e===0&&j/e>=0}},ID:function(a,b){return a.nodeType===1&&a.getAttribute("id")===b},TAG:function(a,b){return b==="*"&&a.nodeType===1||a.nodeName.toLowerCase()===b},CLASS:function(a,b){return(" "+(a.className||a.getAttribute("class"))+" ").indexOf(b)>-1},ATTR:function(a,b){var c=b[1],d=l.attrHandle[c]?l.attrHandle[c](a):a[c]!=null?a[c]:a.getAttribute(c),e=d+"",f=b[2],g=b[4];return d==null?f==="!=":f==="="?e===g:f==="*="?e.indexOf(g)>=0:f==="~="?(" "+e+" ").indexOf(g)>=0:g?f==="!="?e!==g:f==="^="?e.indexOf(g)===0:f==="$="?e.substr(e.length-g.length)===g:f==="|="?e===g||e.substr(0,g.length+1)===g+"-":!1:e&&d!==!1},POS:function(a,b,c,d){var e=b[2],f=l.setFilters[e];if(f)return f(a,c,b,d)}}},m=l.match.POS,n=function(a,b){return"\\"+(b-0+1)};for(var o in l.match)l.match[o]=new RegExp(l.match[o].source+/(?![^\[]*\])(?![^\(]*\))/.source),l.leftMatch[o]=new RegExp(/(^(?:.|\r|\n)*?)/.source+l.match[o].source.replace(/\\(\d+)/g,n));var p=function(a,b){a=Array.prototype.slice.call(a,0);if(b){b.push.apply(b,a);return b}return a};try{Array.prototype.slice.call(c.documentElement.childNodes,0)[0].nodeType}catch(q){p=function(a,b){var c=0,d=b||[];if(e.call(a)==="[object Array]")Array.prototype.push.apply(d,a);else if(typeof a.length=="number")for(var f=a.length;c<f;c++)d.push(a[c]);else for(;a[c];c++)d.push(a[c]);return d}}var r,s;c.documentElement.compareDocumentPosition?r=function(a,b){if(a===b){g=!0;return 0}if(!a.compareDocumentPosition||!b.compareDocumentPosition)return a.compareDocumentPosition?-1:1;return a.compareDocumentPosition(b)&4?-1:1}:(r=function(a,b){if(a===b){g=!0;return 0}if(a.sourceIndex&&b.sourceIndex)return a.sourceIndex-b.sourceIndex;var c,d,e=[],f=[],h=a.parentNode,i=b.parentNode,j=h;if(h===i)return s(a,b);if(!h)return-1;if(!i)return 1;while(j)e.unshift(j),j=j.parentNode;j=i;while(j)f.unshift(j),j=j.parentNode;c=e.length,d=f.length;for(var k=0;k<c&&k<d;k++)if(e[k]!==f[k])return s(e[k],f[k]);return k===c?s(a,f[k],-1):s(e[k],b,1)},s=function(a,b,c){if(a===b)return c;var d=a.nextSibling;while(d){if(d===b)return-1;d=d.nextSibling}return 1}),k.getText=function(a){var b="",c;for(var d=0;a[d];d++)c=a[d],c.nodeType===3||c.nodeType===4?b+=c.nodeValue:c.nodeType!==8&&(b+=k.getText(c.childNodes));return b},function(){var a=c.createElement("div"),d="script"+(new Date).getTime(),e=c.documentElement;a.innerHTML="<a name='"+d+"'/>",e.insertBefore(a,e.firstChild),c.getElementById(d)&&(l.find.ID=function(a,c,d){if(typeof c.getElementById!="undefined"&&!d){var e=c.getElementById(a[1]);return e?e.id===a[1]||typeof e.getAttributeNode!="undefined"&&e.getAttributeNode("id").nodeValue===a[1]?[e]:b:[]}},l.filter.ID=function(a,b){var c=typeof a.getAttributeNode!="undefined"&&a.getAttributeNode("id");return a.nodeType===1&&c&&c.nodeValue===b}),e.removeChild(a),e=a=null}(),function(){var a=c.createElement("div");a.appendChild(c.createComment("")),a.getElementsByTagName("*").length>0&&(l.find.TAG=function(a,b){var c=b.getElementsByTagName(a[1]);if(a[1]==="*"){var d=[];for(var e=0;c[e];e++)c[e].nodeType===1&&d.push(c[e]);c=d}return c}),a.innerHTML="<a href='#'></a>",a.firstChild&&typeof a.firstChild.getAttribute!="undefined"&&a.firstChild.getAttribute("href")!=="#"&&(l.attrHandle.href=function(a){return a.getAttribute("href",2)}),a=null}(),c.querySelectorAll&&function(){var a=k,b=c.createElement("div"),d="__sizzle__";b.innerHTML="<p class='TEST'></p>";if(!b.querySelectorAll||b.querySelectorAll(".TEST").length!==0){k=function(b,e,f,g){e=e||c;if(!g&&!k.isXML(e)){var h=/^(\w+$)|^\.([\w\-]+$)|^#([\w\-]+$)/.exec(b);if(h&&(e.nodeType===1||e.nodeType===9)){if(h[1])return p(e.getElementsByTagName(b),f);if(h[2]&&l.find.CLASS&&e.getElementsByClassName)return p(e.getElementsByClassName(h[2]),f)}if(e.nodeType===9){if(b==="body"&&e.body)return p([e.body],f);if(h&&h[3]){var i=e.getElementById(h[3]);if(!i||!i.parentNode)return p([],f);if(i.id===h[3])return p([i],f)}try{return p(e.querySelectorAll(b),f)}catch(j){}}else if(e.nodeType===1&&e.nodeName.toLowerCase()!=="object"){var m=e,n=e.getAttribute("id"),o=n||d,q=e.parentNode,r=/^\s*[+~]/.test(b);n?o=o.replace(/'/g,"\\$&"):e.setAttribute("id",o),r&&q&&(e=e.parentNode);try{if(!r||q)return p(e.querySelectorAll("[id='"+o+"'] "+b),f)}catch(s){}finally{n||m.removeAttribute("id")}}}return a(b,e,f,g)};for(var e in a)k[e]=a[e];b=null}}(),function(){var a=c.documentElement,b=a.matchesSelector||a.mozMatchesSelector||a.webkitMatchesSelector||a.msMatchesSelector;if(b){var d=!b.call(c.createElement("div"),"div"),e=!1;try{b.call(c.documentElement,"[test!='']:sizzle")}catch(f){e=!0}k.matchesSelector=function(a,c){c=c.replace(/\=\s*([^'"\]]*)\s*\]/g,"='$1']");if(!k.isXML(a))try{if(e||!l.match.PSEUDO.test(c)&&!/!=/.test(c)){var f=b.call(a,c);if(f||!d||a.document&&a.document.nodeType!==11)return f}}catch(g){}return k(c,null,null,[a]).length>0}}}(),function(){var a=c.createElement("div");a.innerHTML="<div class='test e'></div><div class='test'></div>";if(!!a.getElementsByClassName&&a.getElementsByClassName("e").length!==0){a.lastChild.className="e";if(a.getElementsByClassName("e").length===1)return;l.order.splice(1,0,"CLASS"),l.find.CLASS=function(a,b,c){if(typeof b.getElementsByClassName!="undefined"&&!c)return b.getElementsByClassName(a[1])},a=null}}(),c.documentElement.contains?k.contains=function(a,b){return a!==b&&(a.contains?a.contains(b):!0)}:c.documentElement.compareDocumentPosition?k.contains=function(a,b){return!!(a.compareDocumentPosition(b)&16)}:k.contains=function(){return!1},k.isXML=function(a){var b=(a?a.ownerDocument||a:0).documentElement;return b?b.nodeName!=="HTML":!1};var v=function(a,b){var c,d=[],e="",f=b.nodeType?[b]:b;while(c=l.match.PSEUDO.exec(a))e+=c[0],a=a.replace(l.match.PSEUDO,"");a=l.relative[a]?a+"*":a;for(var g=0,h=f.length;g<h;g++)k(a,f[g],d);return k.filter(e,d)};f.find=k,f.expr=k.selectors,f.expr[":"]=f.expr.filters,f.unique=k.uniqueSort,f.text=k.getText,f.isXMLDoc=k.isXML,f.contains=k.contains}();var O=/Until$/,P=/^(?:parents|prevUntil|prevAll)/,Q=/,/,R=/^.[^:#\[\.,]*$/,S=Array.prototype.slice,T=f.expr.match.POS,U={children:!0,contents:!0,next:!0,prev:!0};f.fn.extend({find:function(a){var b=this,c,d;if(typeof a!="string")return f(a).filter(function(){for(c=0,d=b.length;c<d;c++)if(f.contains(b[c],this))return!0});var e=this.pushStack("","find",a),g,h,i;for(c=0,d=this.length;c<d;c++){g=e.length,f.find(a,this[c],e);if(c>0)for(h=g;h<e.length;h++)for(i=0;i<g;i++)if(e[i]===e[h]){e.splice(h--,1);break}}return e},has:function(a){var b=f(a);return this.filter(function(){for(var a=0,c=b.length;a<c;a++)if(f.contains(this,b[a]))return!0})},not:function(a){return this.pushStack(W(this,a,!1),"not",a)},filter:function(a){return this.pushStack(W(this,a,!0),"filter",a)},is:function(a){return!!a&&(typeof a=="string"?f.filter(a,this).length>0:this.filter(a).length>0)},closest:function(a,b){var c=[],d,e,g=this[0];if(f.isArray(a)){var h,i,j={},k=1;if(g&&a.length){for(d=0,e=a.length;d<e;d++)i=a[d],j[i]||(j[i]=T.test(i)?f(i,b||this.context):i);while(g&&g.ownerDocument&&g!==b){for(i in j)h=j[i],(h.jquery?h.index(g)>-1:f(g).is(h))&&c.push({selector:i,elem:g,level:k});g=g.parentNode,k++}}return c}var l=T.test(a)||typeof a!="string"?f(a,b||this.context):0;for(d=0,e=this.length;d<e;d++){g=this[d];while(g){if(l?l.index(g)>-1:f.find.matchesSelector(g,a)){c.push(g);break}g=g.parentNode;if(!g||!g.ownerDocument||g===b||g.nodeType===11)break}}c=c.length>1?f.unique(c):c;return this.pushStack(c,"closest",a)},index:function(a){if(!a||typeof a=="string")return f.inArray(this[0],a?f(a):this.parent().children());return f.inArray(a.jquery?a[0]:a,this)},add:function(a,b){var c=typeof a=="string"?f(a,b):f.makeArray(a&&a.nodeType?[a]:a),d=f.merge(this.get(),c);return this.pushStack(V(c[0])||V(d[0])?d:f.unique(d))},andSelf:function(){return this.add(this.prevObject)}}),f.each({parent:function(a){var b=a.parentNode;return b&&b.nodeType!==11?b:null},parents:function(a){return f.dir(a,"parentNode")},parentsUntil:function(a,b,c){return f.dir(a,"parentNode",c)},next:function(a){return f.nth(a,2,"nextSibling")},prev:function(a){return f.nth(a,2,"previousSibling")},nextAll:function(a){return f.dir(a,"nextSibling")},prevAll:function(a){return f.dir(a,"previousSibling")},nextUntil:function(a,b,c){return f.dir(a,"nextSibling",c)},prevUntil:function(a,b,c){return f.dir(a,"previousSibling",c)},siblings:function(a){return f.sibling(a.parentNode.firstChild,a)},children:function(a){return f.sibling(a.firstChild)},contents:function(a){return f.nodeName(a,"iframe")?a.contentDocument||a.contentWindow.document:f.makeArray(a.childNodes)}},function(a,b){f.fn[a]=function(c,d){var e=f.map(this,b,c),g=S.call(arguments);O.test(a)||(d=c),d&&typeof d=="string"&&(e=f.filter(d,e)),e=this.length>1&&!U[a]?f.unique(e):e,(this.length>1||Q.test(d))&&P.test(a)&&(e=e.reverse());return this.pushStack(e,a,g.join(","))}}),f.extend({filter:function(a,b,c){c&&(a=":not("+a+")");return b.length===1?f.find.matchesSelector(b[0],a)?[b[0]]:[]:f.find.matches(a,b)},dir:function(a,c,d){var e=[],g=a[c];while(g&&g.nodeType!==9&&(d===b||g.nodeType!==1||!f(g).is(d)))g.nodeType===1&&e.push(g),g=g[c];return e},nth:function(a,b,c,d){b=b||1;var e=0;for(;a;a=a[c])if(a.nodeType===1&&++e===b)break;return a},sibling:function(a,b){var c=[];for(;a;a=a.nextSibling)a.nodeType===1&&a!==b&&c.push(a);return c}});var X=/ jQuery\d+="(?:\d+|null)"/g,Y=/^\s+/,Z=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,$=/<([\w:]+)/,_=/<tbody/i,ba=/<|&#?\w+;/,bb=/<(?:script|object|embed|option|style)/i,bc=/checked\s*(?:[^=]|=\s*.checked.)/i,bd=/\/(java|ecma)script/i,be=/^\s*<!(?:\[CDATA\[|\-\-)/,bf={option:[1,"<select multiple='multiple'>","</select>"],legend:[1,"<fieldset>","</fieldset>"],thead:[1,"<table>","</table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"],area:[1,"<map>","</map>"],_default:[0,"",""]};bf.optgroup=bf.option,bf.tbody=bf.tfoot=bf.colgroup=bf.caption=bf.thead,bf.th=bf.td,f.support.htmlSerialize||(bf._default=[1,"div<div>","</div>"]),f.fn.extend({text:function(a){if(f.isFunction(a))return this.each(function(b){var c=f(this);c.text(a.call(this,b,c.text()))});if(typeof a!="object"&&a!==b)return this.empty().append((this[0]&&this[0].ownerDocument||c).createTextNode(a));return f.text(this)},wrapAll:function(a){if(f.isFunction(a))return this.each(function(b){f(this).wrapAll(a.call(this,b))});if(this[0]){var b=f(a,this[0].ownerDocument).eq(0).clone(!0);this[0].parentNode&&b.insertBefore(this[0]),b.map(function(){var a=this;while(a.firstChild&&a.firstChild.nodeType===1)a=a.firstChild;return a}).append(this)}return this},wrapInner:function(a){if(f.isFunction(a))return this.each(function(b){f(this).wrapInner(a.call(this,b))});return this.each(function(){var b=f(this),c=b.contents();c.length?c.wrapAll(a):b.append(a)})},wrap:function(a){return this.each(function(){f(this).wrapAll(a)})},unwrap:function(){return this.parent().each(function(){f.nodeName(this,"body")||f(this).replaceWith(this.childNodes)}).end()},append:function(){return this.domManip(arguments,!0,function(a){this.nodeType===1&&this.appendChild(a)})},prepend:function(){return this.domManip(arguments,!0,function(a){this.nodeType===1&&this.insertBefore(a,this.firstChild)})},before:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,!1,function(a){this.parentNode.insertBefore(a,this)});if(arguments.length){var a=f(arguments[0]);a.push.apply(a,this.toArray());return this.pushStack(a,"before",arguments)}},after:function(){if(this[0]&&this[0].parentNode)return this.domManip(arguments,!1,function(a){this.parentNode.insertBefore(a,this.nextSibling)});if(arguments.length){var a=this.pushStack(this,"after",arguments);a.push.apply(a,f(arguments[0]).toArray());return a}},remove:function(a,b){for(var c=0,d;(d=this[c])!=null;c++)if(!a||f.filter(a,[d]).length)!b&&d.nodeType===1&&(f.cleanData(d.getElementsByTagName("*")),f.cleanData([d])),d.parentNode&&d.parentNode.removeChild(d);return this},empty:function(){for(var a=0,b;(b=this[a])!=null;a++){b.nodeType===1&&f.cleanData(b.getElementsByTagName("*"));while(b.firstChild)b.removeChild(b.firstChild)}return this},clone:function(a,b){a=a==null?!1:a,b=b==null?a:b;return this.map(function(){return f.clone(this,a,b)})},html:function(a){if(a===b)return this[0]&&this[0].nodeType===1?this[0].innerHTML.replace(X,""):null;if(typeof a=="string"&&!bb.test(a)&&(f.support.leadingWhitespace||!Y.test(a))&&!bf[($.exec(a)||["",""])[1].toLowerCase()]){a=a.replace(Z,"<$1></$2>");try{for(var c=0,d=this.length;c<d;c++)this[c].nodeType===1&&(f.cleanData(this[c].getElementsByTagName("*")),this[c].innerHTML=a)}catch(e){this.empty().append(a)}}else f.isFunction(a)?this.each(function(b){var c=f(this);c.html(a.call(this,b,c.html()))}):this.empty().append(a);return this},replaceWith:function(a){if(this[0]&&this[0].parentNode){if(f.isFunction(a))return this.each(function(b){var c=f(this),d=c.html();c.replaceWith(a.call(this,b,d))});typeof a!="string"&&(a=f(a).detach());return this.each(function(){var b=this.nextSibling,c=this.parentNode;f(this).remove(),b?f(b).before(a):f(c).append(a)})}return this.length?this.pushStack(f(f.isFunction(a)?a():a),"replaceWith",a):this},detach:function(a){return this.remove(a,!0)},domManip:function(a,c,d){var e,g,h,i,j=a[0],k=[];if(!f.support.checkClone&&arguments.length===3&&typeof j=="string"&&bc.test(j))return this.each(function(){f(this).domManip(a,c,d,!0)});if(f.isFunction(j))return this.each(function(e){var g=f(this);a[0]=j.call(this,e,c?g.html():b),g.domManip(a,c,d)});if(this[0]){i=j&&j.parentNode,f.support.parentNode&&i&&i.nodeType===11&&i.childNodes.length===this.length?e={fragment:i}:e=f.buildFragment(a,this,k),h=e.fragment,h.childNodes.length===1?g=h=h.firstChild:g=h.firstChild;if(g){c=c&&f.nodeName(g,"tr");for(var l=0,m=this.length,n=m-1;l<m;l++)d.call(c?bg(this[l],g):this[l],e.cacheable||m>1&&l<n?f.clone(h,!0,!0):h)}k.length&&f.each(k,bm)}return this}}),f.buildFragment=function(a,b,d){var e,g,h,i;b&&b[0]&&(i=b[0].ownerDocument||b[0]),i.createDocumentFragment||(i=c),a.length===1&&typeof a[0]=="string"&&a[0].length<512&&i===c&&a[0].charAt(0)==="<"&&!bb.test(a[0])&&(f.support.checkClone||!bc.test(a[0]))&&(g=!0,h=f.fragments[a[0]],h&&h!==1&&(e=h)),e||(e=i.createDocumentFragment(),f.clean(a,i,e,d)),g&&(f.fragments[a[0]]=h?e:1);return{fragment:e,cacheable:g}},f.fragments={},f.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){f.fn[a]=function(c){var d=[],e=f(c),g=this.length===1&&this[0].parentNode;if(g&&g.nodeType===11&&g.childNodes.length===1&&e.length===1){e[b](this[0]);return this}for(var h=0,i=e.length;h<i;h++){var j=(h>0?this.clone(!0):this).get();f(e[h])[b](j),d=d.concat(j
)}return this.pushStack(d,a,e.selector)}}),f.extend({clone:function(a,b,c){var d=a.cloneNode(!0),e,g,h;if((!f.support.noCloneEvent||!f.support.noCloneChecked)&&(a.nodeType===1||a.nodeType===11)&&!f.isXMLDoc(a)){bi(a,d),e=bj(a),g=bj(d);for(h=0;e[h];++h)bi(e[h],g[h])}if(b){bh(a,d);if(c){e=bj(a),g=bj(d);for(h=0;e[h];++h)bh(e[h],g[h])}}e=g=null;return d},clean:function(a,b,d,e){var g;b=b||c,typeof b.createElement=="undefined"&&(b=b.ownerDocument||b[0]&&b[0].ownerDocument||c);var h=[],i;for(var j=0,k;(k=a[j])!=null;j++){typeof k=="number"&&(k+="");if(!k)continue;if(typeof k=="string")if(!ba.test(k))k=b.createTextNode(k);else{k=k.replace(Z,"<$1></$2>");var l=($.exec(k)||["",""])[1].toLowerCase(),m=bf[l]||bf._default,n=m[0],o=b.createElement("div");o.innerHTML=m[1]+k+m[2];while(n--)o=o.lastChild;if(!f.support.tbody){var p=_.test(k),q=l==="table"&&!p?o.firstChild&&o.firstChild.childNodes:m[1]==="<table>"&&!p?o.childNodes:[];for(i=q.length-1;i>=0;--i)f.nodeName(q[i],"tbody")&&!q[i].childNodes.length&&q[i].parentNode.removeChild(q[i])}!f.support.leadingWhitespace&&Y.test(k)&&o.insertBefore(b.createTextNode(Y.exec(k)[0]),o.firstChild),k=o.childNodes}var r;if(!f.support.appendChecked)if(k[0]&&typeof (r=k.length)=="number")for(i=0;i<r;i++)bl(k[i]);else bl(k);k.nodeType?h.push(k):h=f.merge(h,k)}if(d){g=function(a){return!a.type||bd.test(a.type)};for(j=0;h[j];j++)if(e&&f.nodeName(h[j],"script")&&(!h[j].type||h[j].type.toLowerCase()==="text/javascript"))e.push(h[j].parentNode?h[j].parentNode.removeChild(h[j]):h[j]);else{if(h[j].nodeType===1){var s=f.grep(h[j].getElementsByTagName("script"),g);h.splice.apply(h,[j+1,0].concat(s))}d.appendChild(h[j])}}return h},cleanData:function(a){var b,c,d=f.cache,e=f.expando,g=f.event.special,h=f.support.deleteExpando;for(var i=0,j;(j=a[i])!=null;i++){if(j.nodeName&&f.noData[j.nodeName.toLowerCase()])continue;c=j[f.expando];if(c){b=d[c]&&d[c][e];if(b&&b.events){for(var k in b.events)g[k]?f.event.remove(j,k):f.removeEvent(j,k,b.handle);b.handle&&(b.handle.elem=null)}h?delete j[f.expando]:j.removeAttribute&&j.removeAttribute(f.expando),delete d[c]}}}});var bn=/alpha\([^)]*\)/i,bo=/opacity=([^)]*)/,bp=/([A-Z]|^ms)/g,bq=/^-?\d+(?:px)?$/i,br=/^-?\d/,bs=/^[+\-]=/,bt=/[^+\-\.\de]+/g,bu={position:"absolute",visibility:"hidden",display:"block"},bv=["Left","Right"],bw=["Top","Bottom"],bx,by,bz;f.fn.css=function(a,c){if(arguments.length===2&&c===b)return this;return f.access(this,a,c,!0,function(a,c,d){return d!==b?f.style(a,c,d):f.css(a,c)})},f.extend({cssHooks:{opacity:{get:function(a,b){if(b){var c=bx(a,"opacity","opacity");return c===""?"1":c}return a.style.opacity}}},cssNumber:{fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":f.support.cssFloat?"cssFloat":"styleFloat"},style:function(a,c,d,e){if(!!a&&a.nodeType!==3&&a.nodeType!==8&&!!a.style){var g,h,i=f.camelCase(c),j=a.style,k=f.cssHooks[i];c=f.cssProps[i]||i;if(d===b){if(k&&"get"in k&&(g=k.get(a,!1,e))!==b)return g;return j[c]}h=typeof d;if(h==="number"&&isNaN(d)||d==null)return;h==="string"&&bs.test(d)&&(d=+d.replace(bt,"")+parseFloat(f.css(a,c)),h="number"),h==="number"&&!f.cssNumber[i]&&(d+="px");if(!k||!("set"in k)||(d=k.set(a,d))!==b)try{j[c]=d}catch(l){}}},css:function(a,c,d){var e,g;c=f.camelCase(c),g=f.cssHooks[c],c=f.cssProps[c]||c,c==="cssFloat"&&(c="float");if(g&&"get"in g&&(e=g.get(a,!0,d))!==b)return e;if(bx)return bx(a,c)},swap:function(a,b,c){var d={};for(var e in b)d[e]=a.style[e],a.style[e]=b[e];c.call(a);for(e in b)a.style[e]=d[e]}}),f.curCSS=f.css,f.each(["height","width"],function(a,b){f.cssHooks[b]={get:function(a,c,d){var e;if(c){if(a.offsetWidth!==0)return bA(a,b,d);f.swap(a,bu,function(){e=bA(a,b,d)});return e}},set:function(a,b){if(!bq.test(b))return b;b=parseFloat(b);if(b>=0)return b+"px"}}}),f.support.opacity||(f.cssHooks.opacity={get:function(a,b){return bo.test((b&&a.currentStyle?a.currentStyle.filter:a.style.filter)||"")?parseFloat(RegExp.$1)/100+"":b?"1":""},set:function(a,b){var c=a.style,d=a.currentStyle;c.zoom=1;var e=f.isNaN(b)?"":"alpha(opacity="+b*100+")",g=d&&d.filter||c.filter||"";c.filter=bn.test(g)?g.replace(bn,e):g+" "+e}}),f(function(){f.support.reliableMarginRight||(f.cssHooks.marginRight={get:function(a,b){var c;f.swap(a,{display:"inline-block"},function(){b?c=bx(a,"margin-right","marginRight"):c=a.style.marginRight});return c}})}),c.defaultView&&c.defaultView.getComputedStyle&&(by=function(a,c){var d,e,g;c=c.replace(bp,"-$1").toLowerCase();if(!(e=a.ownerDocument.defaultView))return b;if(g=e.getComputedStyle(a,null))d=g.getPropertyValue(c),d===""&&!f.contains(a.ownerDocument.documentElement,a)&&(d=f.style(a,c));return d}),c.documentElement.currentStyle&&(bz=function(a,b){var c,d=a.currentStyle&&a.currentStyle[b],e=a.runtimeStyle&&a.runtimeStyle[b],f=a.style;!bq.test(d)&&br.test(d)&&(c=f.left,e&&(a.runtimeStyle.left=a.currentStyle.left),f.left=b==="fontSize"?"1em":d||0,d=f.pixelLeft+"px",f.left=c,e&&(a.runtimeStyle.left=e));return d===""?"auto":d}),bx=by||bz,f.expr&&f.expr.filters&&(f.expr.filters.hidden=function(a){var b=a.offsetWidth,c=a.offsetHeight;return b===0&&c===0||!f.support.reliableHiddenOffsets&&(a.style.display||f.css(a,"display"))==="none"},f.expr.filters.visible=function(a){return!f.expr.filters.hidden(a)});var bB=/%20/g,bC=/\[\]$/,bD=/\r?\n/g,bE=/#.*$/,bF=/^(.*?):[ \t]*([^\r\n]*)\r?$/mg,bG=/^(?:color|date|datetime|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,bH=/^(?:about|app|app\-storage|.+\-extension|file|widget):$/,bI=/^(?:GET|HEAD)$/,bJ=/^\/\//,bK=/\?/,bL=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,bM=/^(?:select|textarea)/i,bN=/\s+/,bO=/([?&])_=[^&]*/,bP=/^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/,bQ=f.fn.load,bR={},bS={},bT,bU;try{bT=e.href}catch(bV){bT=c.createElement("a"),bT.href="",bT=bT.href}bU=bP.exec(bT.toLowerCase())||[],f.fn.extend({load:function(a,c,d){if(typeof a!="string"&&bQ)return bQ.apply(this,arguments);if(!this.length)return this;var e=a.indexOf(" ");if(e>=0){var g=a.slice(e,a.length);a=a.slice(0,e)}var h="GET";c&&(f.isFunction(c)?(d=c,c=b):typeof c=="object"&&(c=f.param(c,f.ajaxSettings.traditional),h="POST"));var i=this;f.ajax({url:a,type:h,dataType:"html",data:c,complete:function(a,b,c){c=a.responseText,a.isResolved()&&(a.done(function(a){c=a}),i.html(g?f("<div>").append(c.replace(bL,"")).find(g):c)),d&&i.each(d,[c,b,a])}});return this},serialize:function(){return f.param(this.serializeArray())},serializeArray:function(){return this.map(function(){return this.elements?f.makeArray(this.elements):this}).filter(function(){return this.name&&!this.disabled&&(this.checked||bM.test(this.nodeName)||bG.test(this.type))}).map(function(a,b){var c=f(this).val();return c==null?null:f.isArray(c)?f.map(c,function(a,c){return{name:b.name,value:a.replace(bD,"\r\n")}}):{name:b.name,value:c.replace(bD,"\r\n")}}).get()}}),f.each("ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split(" "),function(a,b){f.fn[b]=function(a){return this.bind(b,a)}}),f.each(["get","post"],function(a,c){f[c]=function(a,d,e,g){f.isFunction(d)&&(g=g||e,e=d,d=b);return f.ajax({type:c,url:a,data:d,success:e,dataType:g})}}),f.extend({getScript:function(a,c){return f.get(a,b,c,"script")},getJSON:function(a,b,c){return f.get(a,b,c,"json")},ajaxSetup:function(a,b){b?f.extend(!0,a,f.ajaxSettings,b):(b=a,a=f.extend(!0,f.ajaxSettings,b));for(var c in{context:1,url:1})c in b?a[c]=b[c]:c in f.ajaxSettings&&(a[c]=f.ajaxSettings[c]);return a},ajaxSettings:{url:bT,isLocal:bH.test(bU[1]),global:!0,type:"GET",contentType:"application/x-www-form-urlencoded",processData:!0,async:!0,accepts:{xml:"application/xml, text/xml",html:"text/html",text:"text/plain",json:"application/json, text/javascript","*":"*/*"},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText"},converters:{"* text":a.String,"text html":!0,"text json":f.parseJSON,"text xml":f.parseXML}},ajaxPrefilter:bW(bR),ajaxTransport:bW(bS),ajax:function(a,c){function w(a,c,l,m){if(s!==2){s=2,q&&clearTimeout(q),p=b,n=m||"",v.readyState=a?4:0;var o,r,u,w=l?bZ(d,v,l):b,x,y;if(a>=200&&a<300||a===304){if(d.ifModified){if(x=v.getResponseHeader("Last-Modified"))f.lastModified[k]=x;if(y=v.getResponseHeader("Etag"))f.etag[k]=y}if(a===304)c="notmodified",o=!0;else try{r=b$(d,w),c="success",o=!0}catch(z){c="parsererror",u=z}}else{u=c;if(!c||a)c="error",a<0&&(a=0)}v.status=a,v.statusText=c,o?h.resolveWith(e,[r,c,v]):h.rejectWith(e,[v,c,u]),v.statusCode(j),j=b,t&&g.trigger("ajax"+(o?"Success":"Error"),[v,d,o?r:u]),i.resolveWith(e,[v,c]),t&&(g.trigger("ajaxComplete",[v,d]),--f.active||f.event.trigger("ajaxStop"))}}typeof a=="object"&&(c=a,a=b),c=c||{};var d=f.ajaxSetup({},c),e=d.context||d,g=e!==d&&(e.nodeType||e instanceof f)?f(e):f.event,h=f.Deferred(),i=f._Deferred(),j=d.statusCode||{},k,l={},m={},n,o,p,q,r,s=0,t,u,v={readyState:0,setRequestHeader:function(a,b){if(!s){var c=a.toLowerCase();a=m[c]=m[c]||a,l[a]=b}return this},getAllResponseHeaders:function(){return s===2?n:null},getResponseHeader:function(a){var c;if(s===2){if(!o){o={};while(c=bF.exec(n))o[c[1].toLowerCase()]=c[2]}c=o[a.toLowerCase()]}return c===b?null:c},overrideMimeType:function(a){s||(d.mimeType=a);return this},abort:function(a){a=a||"abort",p&&p.abort(a),w(0,a);return this}};h.promise(v),v.success=v.done,v.error=v.fail,v.complete=i.done,v.statusCode=function(a){if(a){var b;if(s<2)for(b in a)j[b]=[j[b],a[b]];else b=a[v.status],v.then(b,b)}return this},d.url=((a||d.url)+"").replace(bE,"").replace(bJ,bU[1]+"//"),d.dataTypes=f.trim(d.dataType||"*").toLowerCase().split(bN),d.crossDomain==null&&(r=bP.exec(d.url.toLowerCase()),d.crossDomain=!(!r||r[1]==bU[1]&&r[2]==bU[2]&&(r[3]||(r[1]==="http:"?80:443))==(bU[3]||(bU[1]==="http:"?80:443)))),d.data&&d.processData&&typeof d.data!="string"&&(d.data=f.param(d.data,d.traditional)),bX(bR,d,c,v);if(s===2)return!1;t=d.global,d.type=d.type.toUpperCase(),d.hasContent=!bI.test(d.type),t&&f.active++===0&&f.event.trigger("ajaxStart");if(!d.hasContent){d.data&&(d.url+=(bK.test(d.url)?"&":"?")+d.data),k=d.url;if(d.cache===!1){var x=f.now(),y=d.url.replace(bO,"$1_="+x);d.url=y+(y===d.url?(bK.test(d.url)?"&":"?")+"_="+x:"")}}(d.data&&d.hasContent&&d.contentType!==!1||c.contentType)&&v.setRequestHeader("Content-Type",d.contentType),d.ifModified&&(k=k||d.url,f.lastModified[k]&&v.setRequestHeader("If-Modified-Since",f.lastModified[k]),f.etag[k]&&v.setRequestHeader("If-None-Match",f.etag[k])),v.setRequestHeader("Accept",d.dataTypes[0]&&d.accepts[d.dataTypes[0]]?d.accepts[d.dataTypes[0]]+(d.dataTypes[0]!=="*"?", */*; q=0.01":""):d.accepts["*"]);for(u in d.headers)v.setRequestHeader(u,d.headers[u]);if(d.beforeSend&&(d.beforeSend.call(e,v,d)===!1||s===2)){v.abort();return!1}for(u in{success:1,error:1,complete:1})v[u](d[u]);p=bX(bS,d,c,v);if(!p)w(-1,"No Transport");else{v.readyState=1,t&&g.trigger("ajaxSend",[v,d]),d.async&&d.timeout>0&&(q=setTimeout(function(){v.abort("timeout")},d.timeout));try{s=1,p.send(l,w)}catch(z){status<2?w(-1,z):f.error(z)}}return v},param:function(a,c){var d=[],e=function(a,b){b=f.isFunction(b)?b():b,d[d.length]=encodeURIComponent(a)+"="+encodeURIComponent(b)};c===b&&(c=f.ajaxSettings.traditional);if(f.isArray(a)||a.jquery&&!f.isPlainObject(a))f.each(a,function(){e(this.name,this.value)});else for(var g in a)bY(g,a[g],c,e);return d.join("&").replace(bB,"+")}}),f.extend({active:0,lastModified:{},etag:{}});var b_=f.now(),ca=/(\=)\?(&|$)|\?\?/i;f.ajaxSetup({jsonp:"callback",jsonpCallback:function(){return f.expando+"_"+b_++}}),f.ajaxPrefilter("json jsonp",function(b,c,d){var e=b.contentType==="application/x-www-form-urlencoded"&&typeof b.data=="string";if(b.dataTypes[0]==="jsonp"||b.jsonp!==!1&&(ca.test(b.url)||e&&ca.test(b.data))){var g,h=b.jsonpCallback=f.isFunction(b.jsonpCallback)?b.jsonpCallback():b.jsonpCallback,i=a[h],j=b.url,k=b.data,l="$1"+h+"$2";b.jsonp!==!1&&(j=j.replace(ca,l),b.url===j&&(e&&(k=k.replace(ca,l)),b.data===k&&(j+=(/\?/.test(j)?"&":"?")+b.jsonp+"="+h))),b.url=j,b.data=k,a[h]=function(a){g=[a]},d.always(function(){a[h]=i,g&&f.isFunction(i)&&a[h](g[0])}),b.converters["script json"]=function(){g||f.error(h+" was not called");return g[0]},b.dataTypes[0]="json";return"script"}}),f.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/javascript|ecmascript/},converters:{"text script":function(a){f.globalEval(a);return a}}}),f.ajaxPrefilter("script",function(a){a.cache===b&&(a.cache=!1),a.crossDomain&&(a.type="GET",a.global=!1)}),f.ajaxTransport("script",function(a){if(a.crossDomain){var d,e=c.head||c.getElementsByTagName("head")[0]||c.documentElement;return{send:function(f,g){d=c.createElement("script"),d.async="async",a.scriptCharset&&(d.charset=a.scriptCharset),d.src=a.url,d.onload=d.onreadystatechange=function(a,c){if(c||!d.readyState||/loaded|complete/.test(d.readyState))d.onload=d.onreadystatechange=null,e&&d.parentNode&&e.removeChild(d),d=b,c||g(200,"success")},e.insertBefore(d,e.firstChild)},abort:function(){d&&d.onload(0,1)}}}});var cb=a.ActiveXObject?function(){for(var a in cd)cd[a](0,1)}:!1,cc=0,cd;f.ajaxSettings.xhr=a.ActiveXObject?function(){return!this.isLocal&&ce()||cf()}:ce,function(a){f.extend(f.support,{ajax:!!a,cors:!!a&&"withCredentials"in a})}(f.ajaxSettings.xhr()),f.support.ajax&&f.ajaxTransport(function(c){if(!c.crossDomain||f.support.cors){var d;return{send:function(e,g){var h=c.xhr(),i,j;c.username?h.open(c.type,c.url,c.async,c.username,c.password):h.open(c.type,c.url,c.async);if(c.xhrFields)for(j in c.xhrFields)h[j]=c.xhrFields[j];c.mimeType&&h.overrideMimeType&&h.overrideMimeType(c.mimeType),!c.crossDomain&&!e["X-Requested-With"]&&(e["X-Requested-With"]="XMLHttpRequest");try{for(j in e)h.setRequestHeader(j,e[j])}catch(k){}h.send(c.hasContent&&c.data||null),d=function(a,e){var j,k,l,m,n;try{if(d&&(e||h.readyState===4)){d=b,i&&(h.onreadystatechange=f.noop,cb&&delete cd[i]);if(e)h.readyState!==4&&h.abort();else{j=h.status,l=h.getAllResponseHeaders(),m={},n=h.responseXML,n&&n.documentElement&&(m.xml=n),m.text=h.responseText;try{k=h.statusText}catch(o){k=""}!j&&c.isLocal&&!c.crossDomain?j=m.text?200:404:j===1223&&(j=204)}}}catch(p){e||g(-1,p)}m&&g(j,k,m,l)},!c.async||h.readyState===4?d():(i=++cc,cb&&(cd||(cd={},f(a).unload(cb)),cd[i]=d),h.onreadystatechange=d)},abort:function(){d&&d(0,1)}}}});var cg={},ch,ci,cj=/^(?:toggle|show|hide)$/,ck=/^([+\-]=)?([\d+.\-]+)([a-z%]*)$/i,cl,cm=[["height","marginTop","marginBottom","paddingTop","paddingBottom"],["width","marginLeft","marginRight","paddingLeft","paddingRight"],["opacity"]],cn,co=a.webkitRequestAnimationFrame||a.mozRequestAnimationFrame||a.oRequestAnimationFrame;f.fn.extend({show:function(a,b,c){var d,e;if(a||a===0)return this.animate(cr("show",3),a,b,c);for(var g=0,h=this.length;g<h;g++)d=this[g],d.style&&(e=d.style.display,!f._data(d,"olddisplay")&&e==="none"&&(e=d.style.display=""),e===""&&f.css(d,"display")==="none"&&f._data(d,"olddisplay",cs(d.nodeName)));for(g=0;g<h;g++){d=this[g];if(d.style){e=d.style.display;if(e===""||e==="none")d.style.display=f._data(d,"olddisplay")||""}}return this},hide:function(a,b,c){if(a||a===0)return this.animate(cr("hide",3),a,b,c);for(var d=0,e=this.length;d<e;d++)if(this[d].style){var g=f.css(this[d],"display");g!=="none"&&!f._data(this[d],"olddisplay")&&f._data(this[d],"olddisplay",g)}for(d=0;d<e;d++)this[d].style&&(this[d].style.display="none");return this},_toggle:f.fn.toggle,toggle:function(a,b,c){var d=typeof a=="boolean";f.isFunction(a)&&f.isFunction(b)?this._toggle.apply(this,arguments):a==null||d?this.each(function(){var b=d?a:f(this).is(":hidden");f(this)[b?"show":"hide"]()}):this.animate(cr("toggle",3),a,b,c);return this},fadeTo:function(a,b,c,d){return this.filter(":hidden").css("opacity",0).show().end().animate({opacity:b},a,c,d)},animate:function(a,b,c,d){var e=f.speed(b,c,d);if(f.isEmptyObject(a))return this.each(e.complete,[!1]);a=f.extend({},a);return this[e.queue===!1?"each":"queue"](function(){e.queue===!1&&f._mark(this);var b=f.extend({},e),c=this.nodeType===1,d=c&&f(this).is(":hidden"),g,h,i,j,k,l,m,n,o;b.animatedProperties={};for(i in a){g=f.camelCase(i),i!==g&&(a[g]=a[i],delete a[i]),h=a[g],f.isArray(h)?(b.animatedProperties[g]=h[1],h=a[g]=h[0]):b.animatedProperties[g]=b.specialEasing&&b.specialEasing[g]||b.easing||"swing";if(h==="hide"&&d||h==="show"&&!d)return b.complete.call(this);c&&(g==="height"||g==="width")&&(b.overflow=[this.style.overflow,this.style.overflowX,this.style.overflowY],f.css(this,"display")==="inline"&&f.css(this,"float")==="none"&&(f.support.inlineBlockNeedsLayout?(j=cs(this.nodeName),j==="inline"?this.style.display="inline-block":(this.style.display="inline",this.style.zoom=1)):this.style.display="inline-block"))}b.overflow!=null&&(this.style.overflow="hidden");for(i in a)k=new f.fx(this,b,i),h=a[i],cj.test(h)?k[h==="toggle"?d?"show":"hide":h]():(l=ck.exec(h),m=k.cur(),l?(n=parseFloat(l[2]),o=l[3]||(f.cssNumber[i]?"":"px"),o!=="px"&&(f.style(this,i,(n||1)+o),m=(n||1)/k.cur()*m,f.style(this,i,m+o)),l[1]&&(n=(l[1]==="-="?-1:1)*n+m),k.custom(m,n,o)):k.custom(m,h,""));return!0})},stop:function(a,b){a&&this.queue([]),this.each(function(){var a=f.timers,c=a.length;b||f._unmark(!0,this);while(c--)a[c].elem===this&&(b&&a[c](!0),a.splice(c,1))}),b||this.dequeue();return this}}),f.each({slideDown:cr("show",1),slideUp:cr("hide",1),slideToggle:cr("toggle",1),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(a,b){f.fn[a]=function(a,c,d){return this.animate(b,a,c,d)}}),f.extend({speed:function(a,b,c){var d=a&&typeof a=="object"?f.extend({},a):{complete:c||!c&&b||f.isFunction(a)&&a,duration:a,easing:c&&b||b&&!f.isFunction(b)&&b};d.duration=f.fx.off?0:typeof d.duration=="number"?d.duration:d.duration in f.fx.speeds?f.fx.speeds[d.duration]:f.fx.speeds._default,d.old=d.complete,d.complete=function(a){f.isFunction(d.old)&&d.old.call(this),d.queue!==!1?f.dequeue(this):a!==!1&&f._unmark(this)};return d},easing:{linear:function(a,b,c,d){return c+d*a},swing:function(a,b,c,d){return(-Math.cos(a*Math.PI)/2+.5)*d+c}},timers:[],fx:function(a,b,c){this.options=b,this.elem=a,this.prop=c,b.orig=b.orig||{}}}),f.fx.prototype={update:function(){this.options.step&&this.options.step.call(this.elem,this.now,this),(f.fx.step[this.prop]||f.fx.step._default)(this)},cur:function(){if(this.elem[this.prop]!=null&&(!this.elem.style||this.elem.style[this.prop]==null))return this.elem[this.prop];var a,b=f.css(this.elem,this.prop);return isNaN(a=parseFloat(b))?!b||b==="auto"?0:b:a},custom:function(a,b,c){function h(a){return d.step(a)}var d=this,e=f.fx,g;this.startTime=cn||cp(),this.start=a,this.end=b,this.unit=c||this.unit||(f.cssNumber[this.prop]?"":"px"),this.now=this.start,this.pos=this.state=0,h.elem=this.elem,h()&&f.timers.push(h)&&!cl&&(co?(cl=!0,g=function(){cl&&(co(g),e.tick())},co(g)):cl=setInterval(e.tick,e.interval))},show:function(){this.options.orig[this.prop]=f.style(this.elem,this.prop),this.options.show=!0,this.custom(this.prop==="width"||this.prop==="height"?1:0,this.cur()),f(this.elem).show()},hide:function(){this.options.orig[this.prop]=f.style(this.elem,this.prop),this.options.hide=!0,this.custom(this.cur(),0)},step:function(a){var b=cn||cp(),c=!0,d=this.elem,e=this.options,g,h;if(a||b>=e.duration+this.startTime){this.now=this.end,this.pos=this.state=1,this.update(),e.animatedProperties[this.prop]=!0;for(g in e.animatedProperties)e.animatedProperties[g]!==!0&&(c=!1);if(c){e.overflow!=null&&!f.support.shrinkWrapBlocks&&f.each(["","X","Y"],function(a,b){d.style["overflow"+b]=e.overflow[a]}),e.hide&&f(d).hide();if(e.hide||e.show)for(var i in e.animatedProperties)f.style(d,i,e.orig[i]);e.complete.call(d)}return!1}e.duration==Infinity?this.now=b:(h=b-this.startTime,this.state=h/e.duration,this.pos=f.easing[e.animatedProperties[this.prop]](this.state,h,0,1,e.duration),this.now=this.start+(this.end-this.start)*this.pos),this.update();return!0}},f.extend(f.fx,{tick:function(){for(var a=f.timers,b=0;b<a.length;++b)a[b]()||a.splice(b--,1);a.length||f.fx.stop()},interval:13,stop:function(){clearInterval(cl),cl=null},speeds:{slow:600,fast:200,_default:400},step:{opacity:function(a){f.style(a.elem,"opacity",a.now)},_default:function(a){a.elem.style&&a.elem.style[a.prop]!=null?a.elem.style[a.prop]=(a.prop==="width"||a.prop==="height"?Math.max(0,a.now):a.now)+a.unit:a.elem[a.prop]=a.now}}}),f.expr&&f.expr.filters&&(f.expr.filters.animated=function(a){return f.grep(f.timers,function(b){return a===b.elem}).length});var ct=/^t(?:able|d|h)$/i,cu=/^(?:body|html)$/i;"getBoundingClientRect"in c.documentElement?f.fn.offset=function(a){var b=this[0],c;if(a)return this.each(function(b){f.offset.setOffset(this,a,b)});if(!b||!b.ownerDocument)return null;if(b===b.ownerDocument.body)return f.offset.bodyOffset(b);try{c=b.getBoundingClientRect()}catch(d){}var e=b.ownerDocument,g=e.documentElement;if(!c||!f.contains(g,b))return c?{top:c.top,left:c.left}:{top:0,left:0};var h=e.body,i=cv(e),j=g.clientTop||h.clientTop||0,k=g.clientLeft||h.clientLeft||0,l=i.pageYOffset||f.support.boxModel&&g.scrollTop||h.scrollTop,m=i.pageXOffset||f.support.boxModel&&g.scrollLeft||h.scrollLeft,n=c.top+l-j,o=c.left+m-k;return{top:n,left:o}}:f.fn.offset=function(a){var b=this[0];if(a)return this.each(function(b){f.offset.setOffset(this,a,b)});if(!b||!b.ownerDocument)return null;if(b===b.ownerDocument.body)return f.offset.bodyOffset(b);f.offset.initialize();var c,d=b.offsetParent,e=b,g=b.ownerDocument,h=g.documentElement,i=g.body,j=g.defaultView,k=j?j.getComputedStyle(b,null):b.currentStyle,l=b.offsetTop,m=b.offsetLeft;while((b=b.parentNode)&&b!==i&&b!==h){if(f.offset.supportsFixedPosition&&k.position==="fixed")break;c=j?j.getComputedStyle(b,null):b.currentStyle,l-=b.scrollTop,m-=b.scrollLeft,b===d&&(l+=b.offsetTop,m+=b.offsetLeft,f.offset.doesNotAddBorder&&(!f.offset.doesAddBorderForTableAndCells||!ct.test(b.nodeName))&&(l+=parseFloat(c.borderTopWidth)||0,m+=parseFloat(c.borderLeftWidth)||0),e=d,d=b.offsetParent),f.offset.subtractsBorderForOverflowNotVisible&&c.overflow!=="visible"&&(l+=parseFloat(c.borderTopWidth)||0,m+=parseFloat(c.borderLeftWidth)||0),k=c}if(k.position==="relative"||k.position==="static")l+=i.offsetTop,m+=i.offsetLeft;f.offset.supportsFixedPosition&&k.position==="fixed"&&(l+=Math.max(h.scrollTop,i.scrollTop),m+=Math.max(h.scrollLeft,i.scrollLeft));return{top:l,left:m}},f.offset={initialize:function(){var a=c.body,b=c.createElement("div"),d,e,g,h,i=parseFloat(f.css(a,"marginTop"))||0,j="<div style='position:absolute;top:0;left:0;margin:0;border:5px solid #000;padding:0;width:1px;height:1px;'><div></div></div><table style='position:absolute;top:0;left:0;margin:0;border:5px solid #000;padding:0;width:1px;height:1px;' cellpadding='0' cellspacing='0'><tr><td></td></tr></table>";f.extend(b.style,{position:"absolute",top:0,left:0,margin:0,border:0,width:"1px",height:"1px",visibility:"hidden"}),b.innerHTML=j,a.insertBefore(b,a.firstChild),d=b.firstChild,e=d.firstChild,h=d.nextSibling.firstChild.firstChild,this.doesNotAddBorder=e.offsetTop!==5,this.doesAddBorderForTableAndCells=h.offsetTop===5,e.style.position="fixed",e.style.top="20px",this.supportsFixedPosition=e.offsetTop===20||e.offsetTop===15,e.style.position=e.style.top="",d.style.overflow="hidden",d.style.position="relative",this.subtractsBorderForOverflowNotVisible=e.offsetTop===-5,this.doesNotIncludeMarginInBodyOffset=a.offsetTop!==i,a.removeChild(b),f.offset.initialize=f.noop},bodyOffset:function(a){var b=a.offsetTop,c=a.offsetLeft;f.offset.initialize(),f.offset.doesNotIncludeMarginInBodyOffset&&(b+=parseFloat(f.css(a,"marginTop"))||0,c+=parseFloat(f.css(a,"marginLeft"))||0);return{top:b,left:c}},setOffset:function(a,b,c){var d=f.css(a,"position");d==="static"&&(a.style.position="relative");var e=f(a),g=e.offset(),h=f.css(a,"top"),i=f.css(a,"left"),j=(d==="absolute"||d==="fixed")&&f.inArray("auto",[h,i])>-1,k={},l={},m,n;j?(l=e.position(),m=l.top,n=l.left):(m=parseFloat(h)||0,n=parseFloat(i)||0),f.isFunction(b)&&(b=b.call(a,c,g)),b.top!=null&&(k.top=b.top-g.top+m),b.left!=null&&(k.left=b.left-g.left+n),"using"in b?b.using.call(a,k):e.css(k)}},f.fn.extend({position:function(){if(!this[0])return null;var a=this[0],b=this.offsetParent(),c=this.offset(),d=cu.test(b[0].nodeName)?{top:0,left:0}:b.offset();c.top-=parseFloat(f.css(a,"marginTop"))||0,c.left-=parseFloat(f.css(a,"marginLeft"))||0,d.top+=parseFloat(f.css(b[0],"borderTopWidth"))||0,d.left+=parseFloat(f.css(b[0],"borderLeftWidth"))||0;return{top:c.top-d.top,left:c.left-d.left}},offsetParent:function(){return this.map(function(){var a=this.offsetParent||c.body;while(a&&!cu.test(a.nodeName)&&f.css(a,"position")==="static")a=a.offsetParent;return a})}}),f.each(["Left","Top"],function(a,c){var d="scroll"+c;f.fn[d]=function(c){var e,g;if(c===b){e=this[0];if(!e)return null;g=cv(e);return g?"pageXOffset"in g?g[a?"pageYOffset":"pageXOffset"]:f.support.boxModel&&g.document.documentElement[d]||g.document.body[d]:e[d]}return this.each(function(){g=cv(this),g?g.scrollTo(a?f(g).scrollLeft():c,a?c:f(g).scrollTop()):this[d]=c})}}),f.each(["Height","Width"],function(a,c){var d=c.toLowerCase();f.fn["inner"+c]=function(){var a=this[0];return a&&a.style?parseFloat(f.css(a,d,"padding")):null},f.fn["outer"+c]=function(a){var b=this[0];return b&&b.style?parseFloat(f.css(b,d,a?"margin":"border")):null},f.fn[d]=function(a){var e=this[0];if(!e)return a==null?null:this;if(f.isFunction(a))return this.each(function(b){var c=f(this);c[d](a.call(this,b,c[d]()))});if(f.isWindow(e)){var g=e.document.documentElement["client"+c];return e.document.compatMode==="CSS1Compat"&&g||e.document.body["client"+c]||g}if(e.nodeType===9)return Math.max(e.documentElement["client"+c],e.body["scroll"+c],e.documentElement["scroll"+c],e.body["offset"+c],e.documentElement["offset"+c]);if(a===b){var h=f.css(e,d),i=parseFloat(h);return f.isNaN(i)?h:i}return this.css(d,typeof a=="string"?a:a+"px")}}),a.jQuery=a.$=f})(window);// Init jQuery mobile
$(document).bind("mobileinit", function() {
	// jQuery mobile configuration
	$.extend($.mobile, {
		// Config..
	});
	$.mobile.page.prototype.options.addBackBtn = true;
	

	// This will be executed when jQuery mobile is loaded,
	// place code here..
});

//phonegap replacement function for $(document).ready
document.addEventListener("deviceready", onDeviceReady, false);
function onDeviceReady(){

}

$(document).ready(function() {
	// This is baddy, this won'd work with phonegap, also the constant ajax calls will nullify it
}); //end doc.ready

$("#obs_bird").live('pagecreate',function(event){
/*
	$(".extended_options").hide(); // hide by default
	$(".add_info").toggle(
		function(){
			$(".extended_options",$(this).parent()).show('slow');},
		function(){
			$(".extended_options",$(this).parent()).hide('slow');}
		);
*/

});

//back button 
$('.ui-btn-back').live('tap',function() {
	history.back(); return false;
	}).live('click',function() {
	return false;
});/*!
 * jQuery Mobile v1.0b2
 * http://jquerymobile.com/
 *
 * Copyright 2010, jQuery Project
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 */
(function(a,d){if(a.cleanData){var c=a.cleanData;a.cleanData=function(f){for(var b=0,d;(d=f[b])!=null;b++)a(d).triggerHandler("remove");c(f)}}else{var b=a.fn.remove;a.fn.remove=function(f,c){return this.each(function(){c||(!f||a.filter(f,[this]).length)&&a("*",this).add([this]).each(function(){a(this).triggerHandler("remove")});return b.call(a(this),f,c)})}}a.widget=function(b,c,d){var h=b.split(".")[0],i,b=b.split(".")[1];i=h+"-"+b;if(!d)d=c,c=a.Widget;a.expr[":"][i]=function(c){return!!a.data(c,
b)};a[h]=a[h]||{};a[h][b]=function(a,b){arguments.length&&this._createWidget(a,b)};c=new c;c.options=a.extend(!0,{},c.options);a[h][b].prototype=a.extend(!0,c,{namespace:h,widgetName:b,widgetEventPrefix:a[h][b].prototype.widgetEventPrefix||b,widgetBaseClass:i},d);a.widget.bridge(b,a[h][b])};a.widget.bridge=function(b,c){a.fn[b]=function(g){var h=typeof g==="string",i=Array.prototype.slice.call(arguments,1),k=this,g=!h&&i.length?a.extend.apply(null,[!0,g].concat(i)):g;if(h&&g.charAt(0)==="_")return k;
h?this.each(function(){var c=a.data(this,b);if(!c)throw"cannot call methods on "+b+" prior to initialization; attempted to call method '"+g+"'";if(!a.isFunction(c[g]))throw"no such method '"+g+"' for "+b+" widget instance";var e=c[g].apply(c,i);if(e!==c&&e!==d)return k=e,!1}):this.each(function(){var d=a.data(this,b);d?d.option(g||{})._init():a.data(this,b,new c(g,this))});return k}};a.Widget=function(a,b){arguments.length&&this._createWidget(a,b)};a.Widget.prototype={widgetName:"widget",widgetEventPrefix:"",
options:{disabled:!1},_createWidget:function(b,c){a.data(c,this.widgetName,this);this.element=a(c);this.options=a.extend(!0,{},this.options,this._getCreateOptions(),b);var d=this;this.element.bind("remove."+this.widgetName,function(){d.destroy()});this._create();this._trigger("create");this._init()},_getCreateOptions:function(){var b={};a.metadata&&(b=a.metadata.get(element)[this.widgetName]);return b},_create:function(){},_init:function(){},destroy:function(){this.element.unbind("."+this.widgetName).removeData(this.widgetName);
this.widget().unbind("."+this.widgetName).removeAttr("aria-disabled").removeClass(this.widgetBaseClass+"-disabled ui-state-disabled")},widget:function(){return this.element},option:function(b,c){var g=b;if(arguments.length===0)return a.extend({},this.options);if(typeof b==="string"){if(c===d)return this.options[b];g={};g[b]=c}this._setOptions(g);return this},_setOptions:function(b){var c=this;a.each(b,function(a,b){c._setOption(a,b)});return this},_setOption:function(a,b){this.options[a]=b;a==="disabled"&&
this.widget()[b?"addClass":"removeClass"](this.widgetBaseClass+"-disabled ui-state-disabled").attr("aria-disabled",b);return this},enable:function(){return this._setOption("disabled",!1)},disable:function(){return this._setOption("disabled",!0)},_trigger:function(b,c,d){var h=this.options[b],c=a.Event(c);c.type=(b===this.widgetEventPrefix?b:this.widgetEventPrefix+b).toLowerCase();d=d||{};if(c.originalEvent)for(var b=a.event.props.length,i;b;)i=a.event.props[--b],c[i]=c.originalEvent[i];this.element.trigger(c,
d);return!(a.isFunction(h)&&h.call(this.element[0],c,d)===!1||c.isDefaultPrevented())}}})(jQuery);(function(a,d){a.widget("mobile.widget",{_getCreateOptions:function(){var c=this.element,b={};a.each(this.options,function(a){var e=c.jqmData(a.replace(/[A-Z]/g,function(a){return"-"+a.toLowerCase()}));e!==d&&(b[a]=e)});return b}})})(jQuery);
(function(a){a(window);var d=a("html");a.mobile.media=function(){var c={},b=a("<div id='jquery-mediatest'>"),f=a("<body>").append(b);return function(a){if(!(a in c)){var g=document.createElement("style"),h="@media "+a+" { #jquery-mediatest { position:absolute; } }";g.type="text/css";g.styleSheet?g.styleSheet.cssText=h:g.appendChild(document.createTextNode(h));d.prepend(f).prepend(g);c[a]=b.css("position")==="absolute";f.add(g).remove()}return c[a]}}()})(jQuery);
(function(a,d){function c(a){var b=a.charAt(0).toUpperCase()+a.substr(1),a=(a+" "+e.join(b+" ")+b).split(" "),c;for(c in a)if(f[c]!==d)return!0}var b=a("<body>").prependTo("html"),f=b[0].style,e=["webkit","moz","o"],g="palmGetResource"in window,h=window.blackberry;a.mobile.browser={};a.mobile.browser.ie=function(){for(var a=3,b=document.createElement("div"),c=b.all||[];b.innerHTML="<\!--[if gt IE "+ ++a+"]><br><![endif]--\>",c[0];);return a>4?a:!a}();a.extend(a.support,{orientation:"orientation"in
window,touch:"ontouchend"in document,cssTransitions:"WebKitTransitionEvent"in window,pushState:!!history.pushState,mediaquery:a.mobile.media("only all"),cssPseudoElement:!!c("content"),boxShadow:!!c("boxShadow")&&!h,scrollTop:("pageXOffset"in window||"scrollTop"in document.documentElement||"scrollTop"in b[0])&&!g,dynamicBaseTag:function(){var c=location.protocol+"//"+location.host+location.pathname+"ui-dir/",f=a("head base"),d=null,e="",g;f.length?e=f.attr("href"):f=d=a("<base>",{href:c}).appendTo("head");
g=a("<a href='testurl'></a>").prependTo(b)[0].href;f[0].href=e?e:location.pathname;d&&d.remove();return g.indexOf(c)===0}(),eventCapture:"addEventListener"in document});b.remove();g=function(){var a=window.navigator.userAgent;return a.indexOf("Nokia")>-1&&(a.indexOf("Symbian/3")>-1||a.indexOf("Series60/5")>-1)&&a.indexOf("AppleWebKit")>-1&&a.match(/(BrowserNG|NokiaBrowser)\/7\.[0-3]/)}();a.mobile.ajaxBlacklist=window.blackberry&&!window.WebKitPoint||window.operamini&&Object.prototype.toString.call(window.operamini)===
"[object OperaMini]"||g;g&&a(function(){a("head link[rel=stylesheet]").attr("rel","alternate stylesheet").attr("rel","stylesheet")});a.support.boxShadow||a("html").addClass("ui-mobile-nosupport-boxshadow")})(jQuery);
(function(a,d,c,b){function f(a){for(;a&&typeof a.originalEvent!=="undefined";)a=a.originalEvent;return a}function e(b){for(var c={},f,d;b;){f=a.data(b,n);for(d in f)if(f[d])c[d]=c.hasVirtualBinding=!0;b=b.parentNode}return c}function g(){v&&(clearTimeout(v),v=0);v=setTimeout(function(){B=v=0;A.length=0;w=!1;r=!0},a.vmouse.resetTimerDuration)}function h(c,d,r){var e=!1,g;if(!(g=r&&r[c])){if(r=!r)a:{for(r=d.target;r;){if((g=a.data(r,n))&&(!c||g[c]))break a;r=r.parentNode}r=null}g=r}if(g){var e=d,r=
e.type,j,h,e=a.Event(e);e.type=c;g=e.originalEvent;j=a.event.props;if(g)for(h=j.length;h;)c=j[--h],e[c]=g[c];if(r.search(/^touch/)!==-1&&(c=f(g),r=c.touches,c=c.changedTouches,r=r&&r.length?r[0]:c&&c.length?c[0]:b)){g=0;for(len=z.length;g<len;g++)c=z[g],e[c]=r[c]}a(d.target).trigger(e);e=e.isDefaultPrevented()}return e}function i(b){var c=a.data(b.target,x);!w&&(!B||B!==c)&&h("v"+b.type,b)}function k(b){var c=f(b).touches,d;if(c&&c.length===1&&(d=b.target,c=e(d),c.hasVirtualBinding))B=F++,a.data(d,
x,B),v&&(clearTimeout(v),v=0),s=r=!1,d=f(b).touches[0],y=d.pageX,u=d.pageY,h("vmouseover",b,c),h("vmousedown",b,c)}function l(a){r||(s||h("vmousecancel",a,e(a.target)),s=!0,g())}function m(b){if(!r){var c=f(b).touches[0],d=s,j=a.vmouse.moveDistanceThreshold;s=s||Math.abs(c.pageX-y)>j||Math.abs(c.pageY-u)>j;flags=e(b.target);s&&!d&&h("vmousecancel",b,flags);h("vmousemove",b,flags);g()}}function p(a){if(!r){r=!0;var b=e(a.target),c;h("vmouseup",a,b);!s&&h("vclick",a,b)&&(c=f(a).changedTouches[0],A.push({touchID:B,
x:c.clientX,y:c.clientY}),w=!0);h("vmouseout",a,b);s=!1;g()}}function o(b){var b=a.data(b,n),c;if(b)for(c in b)if(b[c])return!0;return!1}function j(){}function q(b){var c=b.substr(1);return{setup:function(){o(this)||a.data(this,n,{});a.data(this,n)[b]=!0;t[b]=(t[b]||0)+1;t[b]===1&&C.bind(c,i);a(this).bind(c,j);if(E)t.touchstart=(t.touchstart||0)+1,t.touchstart===1&&C.bind("touchstart",k).bind("touchend",p).bind("touchmove",m).bind("scroll",l)},teardown:function(){--t[b];t[b]||C.unbind(c,i);E&&(--t.touchstart,
t.touchstart||C.unbind("touchstart",k).unbind("touchmove",m).unbind("touchend",p).unbind("scroll",l));var f=a(this),d=a.data(this,n);d&&(d[b]=!1);f.unbind(c,j);o(this)||f.removeData(n)}}}var n="virtualMouseBindings",x="virtualTouchID",d="vmouseover vmousedown vmousemove vmouseup vclick vmouseout vmousecancel".split(" "),z="clientX clientY pageX pageY screenX screenY".split(" "),t={},v=0,y=0,u=0,s=!1,A=[],w=!1,r=!1,E=a.support.eventCapture,C=a(c),F=1,B=0;a.vmouse={moveDistanceThreshold:10,clickDistanceThreshold:10,
resetTimerDuration:1500};for(var D=0;D<d.length;D++)a.event.special[d[D]]=q(d[D]);E&&c.addEventListener("click",function(b){var c=A.length,f=b.target,d,r,e,g,j;if(c){d=b.clientX;r=b.clientY;threshold=a.vmouse.clickDistanceThreshold;for(e=f;e;){for(g=0;g<c;g++)if(j=A[g],e===f&&Math.abs(j.x-d)<threshold&&Math.abs(j.y-r)<threshold||a.data(e,x)===j.touchID){b.preventDefault();b.stopPropagation();return}e=e.parentNode}}},!0)})(jQuery,window,document);
(function(a,d,c){function b(b,c,f){var d=f.type;f.type=c;a.event.handle.call(b,f);f.type=d}a.each("touchstart touchmove touchend orientationchange throttledresize tap taphold swipe swipeleft swiperight scrollstart scrollstop".split(" "),function(b,c){a.fn[c]=function(a){return a?this.bind(c,a):this.trigger(c)};a.attrFn[c]=!0});var f=a.support.touch,e=f?"touchstart":"mousedown",g=f?"touchend":"mouseup",h=f?"touchmove":"mousemove";a.event.special.scrollstart={enabled:!0,setup:function(){function c(a,
e){d=e;b(f,d?"scrollstart":"scrollstop",a)}var f=this,d,e;a(f).bind("touchmove scroll",function(b){a.event.special.scrollstart.enabled&&(d||c(b,!0),clearTimeout(e),e=setTimeout(function(){c(b,!1)},50))})}};a.event.special.tap={setup:function(){var c=this,f=a(c);f.bind("vmousedown",function(a){function d(){g=!1;clearTimeout(h);f.unbind("vclick",e).unbind("vmousecancel",d)}function e(a){d();j==a.target&&b(c,"tap",a)}if(a.which&&a.which!==1)return!1;var g=!0,j=a.target,h;f.bind("vmousecancel",d).bind("vclick",
e);h=setTimeout(function(){g&&b(c,"taphold",a)},750)})}};a.event.special.swipe={scrollSupressionThreshold:10,durationThreshold:1E3,horizontalDistanceThreshold:30,verticalDistanceThreshold:75,setup:function(){var b=a(this);b.bind(e,function(f){function d(b){if(p){var c=b.originalEvent.touches?b.originalEvent.touches[0]:b;o={time:(new Date).getTime(),coords:[c.pageX,c.pageY]};Math.abs(p.coords[0]-o.coords[0])>a.event.special.swipe.scrollSupressionThreshold&&b.preventDefault()}}var e=f.originalEvent.touches?
f.originalEvent.touches[0]:f,p={time:(new Date).getTime(),coords:[e.pageX,e.pageY],origin:a(f.target)},o;b.bind(h,d).one(g,function(){b.unbind(h,d);p&&o&&o.time-p.time<a.event.special.swipe.durationThreshold&&Math.abs(p.coords[0]-o.coords[0])>a.event.special.swipe.horizontalDistanceThreshold&&Math.abs(p.coords[1]-o.coords[1])<a.event.special.swipe.verticalDistanceThreshold&&p.origin.trigger("swipe").trigger(p.coords[0]>o.coords[0]?"swipeleft":"swiperight");p=o=c})})}};(function(a,b){function c(){var a=
d();a!==e&&(e=a,f.trigger("orientationchange"))}var f=a(b),d,e;a.event.special.orientationchange={setup:function(){if(a.support.orientation)return!1;e=d();f.bind("throttledresize",c)},teardown:function(){if(a.support.orientation)return!1;f.unbind("throttledresize",c)},add:function(a){var b=a.handler;a.handler=function(a){a.orientation=d();return b.apply(this,arguments)}}};a.event.special.orientationchange.orientation=d=function(){var a=document.documentElement;return a&&a.clientWidth/a.clientHeight<
1.1?"portrait":"landscape"}})(jQuery,d);(function(){a.event.special.throttledresize={setup:function(){a(this).bind("resize",b)},teardown:function(){a(this).unbind("resize",b)}};var b=function(){d=(new Date).getTime();e=d-c;e>=250?(c=d,a(this).trigger("throttledresize")):(f&&clearTimeout(f),f=setTimeout(b,250-e))},c=0,f,d,e})();a.each({scrollstop:"scrollstart",taphold:"tap",swipeleft:"swipe",swiperight:"swipe"},function(b,c){a.event.special[b]={setup:function(){a(this).bind(c,a.noop)}}})})(jQuery,
this);
(function(a,d,c){function b(a){a=a||location.href;return"#"+a.replace(/^[^#]*#?(.*)$/,"$1")}var f="hashchange",e=document,g,h=a.event.special,i=e.documentMode,k="on"+f in d&&(i===c||i>7);a.fn[f]=function(a){return a?this.bind(f,a):this.trigger(f)};a.fn[f].delay=50;h[f]=a.extend(h[f],{setup:function(){if(k)return!1;a(g.start)},teardown:function(){if(k)return!1;a(g.stop)}});g=function(){function g(){var c=b(),e=n(o);if(c!==o)q(o=c,e),a(d).trigger(f);else if(e!==o)location.href=location.href.replace(/#.*/,"")+
e;i=setTimeout(g,a.fn[f].delay)}var h={},i,o=b(),j=function(a){return a},q=j,n=j;h.start=function(){i||g()};h.stop=function(){i&&clearTimeout(i);i=c};a.browser.msie&&!k&&function(){var c,d;h.start=function(){if(!c)d=(d=a.fn[f].src)&&d+b(),c=a('<iframe tabindex="-1" title="empty"/>').hide().one("load",function(){d||q(b());g()}).attr("src",d||"javascript:0").insertAfter("body")[0].contentWindow,e.onpropertychange=function(){try{if(event.propertyName==="title")c.document.title=e.title}catch(a){}}};h.stop=
j;n=function(){return b(c.location.href)};q=function(b,d){var g=c.document,h=a.fn[f].domain;if(b!==d)g.title=e.title,g.open(),h&&g.write('<script>document.domain="'+h+'"<\/script>'),g.close(),c.location.hash=b}}();return h}()})(jQuery,this);(function(a){a.widget("mobile.page",a.mobile.widget,{options:{theme:"c",domCache:!1},_create:function(){var a=this.element,c=this.options;this._trigger("beforeCreate")!==!1&&a.addClass("ui-page ui-body-"+c.theme)}})})(jQuery);
(function(a,d){a.extend(a.mobile,{ns:"",subPageUrlKey:"ui-page",activePageClass:"ui-page-active",activeBtnClass:"ui-btn-active",ajaxEnabled:!0,hashListeningEnabled:!0,defaultPageTransition:"slide",minScrollBack:screen.height/2,defaultDialogTransition:"pop",loadingMessage:"loading",pageLoadErrorMessage:"Error Loading Page",autoInitializePage:!0,gradeA:function(){return a.support.mediaquery||a.mobile.browser.ie&&a.mobile.browser.ie>=7},keyCode:{ALT:18,BACKSPACE:8,CAPS_LOCK:20,COMMA:188,COMMAND:91,COMMAND_LEFT:91,
COMMAND_RIGHT:93,CONTROL:17,DELETE:46,DOWN:40,END:35,ENTER:13,ESCAPE:27,HOME:36,INSERT:45,LEFT:37,MENU:93,NUMPAD_ADD:107,NUMPAD_DECIMAL:110,NUMPAD_DIVIDE:111,NUMPAD_ENTER:108,NUMPAD_MULTIPLY:106,NUMPAD_SUBTRACT:109,PAGE_DOWN:34,PAGE_UP:33,PERIOD:190,RIGHT:39,SHIFT:16,SPACE:32,TAB:9,UP:38,WINDOWS:91},silentScroll:function(b){if(a.type(b)!=="number")b=a.mobile.defaultHomeScroll;a.event.special.scrollstart.enabled=!1;setTimeout(function(){d.scrollTo(0,b);a(document).trigger("silentscroll",{x:0,y:b})},
20);setTimeout(function(){a.event.special.scrollstart.enabled=!0},150)},nsNormalize:function(b){if(b)return a.camelCase(a.mobile.ns+b)}});a.fn.jqmData=function(b,c){return this.data(b?a.mobile.nsNormalize(b):b,c)};a.jqmData=function(b,c,d){return a.data(b,a.mobile.nsNormalize(c),d)};a.fn.jqmRemoveData=function(b){return this.removeData(a.mobile.nsNormalize(b))};a.jqmRemoveData=function(b,c){return a.removeData(b,a.mobile.nsNormalize(c))};a.jqmHasData=function(b,c){return a.hasData(b,a.mobile.nsNormalize(c))};
var c=a.find;a.find=function(b,d,e,g){b=b.replace(/:jqmData\(([^)]*)\)/g,"[data-"+(a.mobile.ns||"")+"$1]");return c.call(this,b,d,e,g)};a.extend(a.find,c);a.find.matches=function(b,c){return a.find(b,null,null,c)};a.find.matchesSelector=function(b,c){return a.find(c,null,null,[b]).length>0}})(jQuery,this);
(function(a,d){function c(a){var b=a.jqmData("lastClicked");b&&b.length?b.focus():(b=a.find(".ui-title:eq(0)"),b.length?b.focus():a.find(x).eq(0).focus())}function b(b){q&&(!q.closest(".ui-page-active").length||b)&&q.removeClass(a.mobile.activeBtnClass);q=null}function f(){t=!1;z.length>0&&a.mobile.changePage.apply(null,z.pop())}function e(b,d,f,e){var h=a.support.scrollTop?m.scrollTop():!0,j=b.data("lastScroll")||a.mobile.defaultHomeScroll,i=g();h&&window.scrollTo(0,a.mobile.defaultHomeScroll);j<
a.mobile.minScrollBack&&(j=0);d&&(d.height(i+h).jqmData("lastScroll",h).jqmData("lastClicked",q),d.data("page")._trigger("beforehide",null,{nextPage:b}));b.height(i+j).data("page")._trigger("beforeshow",null,{prevPage:d||a("")});a.mobile.hidePageLoadingMsg();f=(a.mobile.transitionHandlers[f||"none"]||a.mobile.defaultTransitionHandler)(f,e,b,d);f.done(function(){b.height("");j?(a.mobile.silentScroll(j),a(document).one("silentscroll",function(){c(b)})):c(b);d&&d.height("").data("page")._trigger("hide",
null,{nextPage:b});b.data("page")._trigger("show",null,{prevPage:d||a("")})});return f}function g(){var b=jQuery.event.special.orientationchange.orientation()==="portrait",c=b?screen.availHeight:screen.availWidth,b=Math.max(b?480:320,a(window).height());return Math.min(c,b)}function h(){a("."+a.mobile.activePageClass).css("min-height",g())}function i(b,c){c&&b.attr("data-"+a.mobile.ns+"role",c);b.page()}function k(a){for(;a;){if(a.nodeName.toLowerCase()=="a")break;a=a.parentNode}return a}function l(b){var b=
a(b).closest(".ui-page").jqmData("url"),c=s.hrefNoHash;if(!b||!j.isPath(b))b=c;return j.makeUrlAbsolute(b,c)}var m=a(window),p=a("html"),o=a("head"),j={urlParseRE:/^(((([^:\/#\?]+:)?(?:\/\/((?:(([^:@\/#\?]+)(?:\:([^:@\/#\?]+))?)@)?(([^:\/#\?]+)(?:\:([0-9]+))?))?)?)?((\/?(?:[^\/\?#]+\/+)*)([^\?#]*)))?(\?[^#]+)?)(#.*)?/,parseUrl:function(b){if(a.type(b)==="object")return b;var b=j.urlParseRE.exec(b),c;b&&(c={href:b[0]||"",hrefNoHash:b[1]||"",hrefNoSearch:b[2]||"",domain:b[3]||"",protocol:b[4]||"",authority:b[5]||
"",username:b[7]||"",password:b[8]||"",host:b[9]||"",hostname:b[10]||"",port:b[11]||"",pathname:b[12]||"",directory:b[13]||"",filename:b[14]||"",search:b[15]||"",hash:b[16]||""});return c||{}},makePathAbsolute:function(a,b){if(a&&a.charAt(0)==="/")return a;for(var a=a||"",c=(b=b?b.replace(/^\/|(\/[^\/]*|[^\/]+)$/g,""):"")?b.split("/"):[],d=a.split("/"),f=0;f<d.length;f++){var e=d[f];switch(e){case ".":break;case "..":c.length&&c.pop();break;default:c.push(e)}}return"/"+c.join("/")},isSameDomain:function(a,
b){return j.parseUrl(a).domain===j.parseUrl(b).domain},isRelativeUrl:function(a){return j.parseUrl(a).protocol===""},isAbsoluteUrl:function(a){return j.parseUrl(a).protocol!==""},makeUrlAbsolute:function(a,b){if(!j.isRelativeUrl(a))return a;var c=j.parseUrl(a),d=j.parseUrl(b),f=c.protocol||d.protocol,e=c.authority||d.authority,g=c.pathname!=="",h=j.makePathAbsolute(c.pathname||d.filename,d.pathname);return f+"//"+e+h+(c.search||!g&&d.search||"")+c.hash},addSearchParams:function(b,c){var d=j.parseUrl(b),
f=typeof c==="object"?a.param(c):c,e=d.search||"?";return d.hrefNoSearch+e+(e.charAt(e.length-1)!=="?"?"&":"")+f+(d.hash||"")},convertUrlToDataUrl:function(a){var b=j.parseUrl(a);if(j.isEmbeddedPage(b))return b.hash.split(v)[0].replace(/^#/,"");else if(j.isSameDomain(b,s))return b.hrefNoHash.replace(s.domain,"");return a},get:function(a){if(a===d)a=location.hash;return j.stripHash(a).replace(/[^\/]*\.[^\/*]+$/,"")},getFilePath:function(b){var c="&"+a.mobile.subPageUrlKey;return b&&b.split(c)[0].split(v)[0]},
set:function(a){location.hash=a},isPath:function(a){return/\//.test(a)},clean:function(a){return a.replace(s.domain,"")},stripHash:function(a){return a.replace(/^#/,"")},cleanHash:function(a){return j.stripHash(a.replace(/\?.*$/,"").replace(v,""))},isExternal:function(a){a=j.parseUrl(a);return a.protocol&&a.domain!==u.domain?!0:!1},hasProtocol:function(a){return/^(:?\w+:)/.test(a)},isEmbeddedPage:function(a){a=j.parseUrl(a);if(a.protocol!=="")return a.hash&&(a.hrefNoHash===u.hrefNoHash||A&&a.hrefNoHash===
s.hrefNoHash);return/^#/.test(a.href)}},q=null,n={stack:[],activeIndex:0,getActive:function(){return n.stack[n.activeIndex]},getPrev:function(){return n.stack[n.activeIndex-1]},getNext:function(){return n.stack[n.activeIndex+1]},addNew:function(a,b,c,d){n.getNext()&&n.clearForward();n.stack.push({url:a,transition:b,title:c,pageUrl:d});n.activeIndex=n.stack.length-1},clearForward:function(){n.stack=n.stack.slice(0,n.activeIndex+1)},directHashChange:function(b){var c,f,e;a.each(n.stack,function(a,d){b.currentUrl===
d.url&&(c=a<n.activeIndex,f=!c,e=a)});this.activeIndex=e!==d?e:this.activeIndex;c?b.isBack():f&&b.isForward()},ignoreNextHashChange:!1},x="[tabindex],a,button:visible,select:visible,input",z=[],t=!1,v="&ui-state=dialog",y=o.children("base"),u=j.parseUrl(location.href),s=y.length?j.parseUrl(j.makeUrlAbsolute(y.attr("href"),u.href)):u,A=u.hrefNoHash!==s.hrefNoHash,w=a.support.dynamicBaseTag?{element:y.length?y:a("<base>",{href:s.hrefNoHash}).prependTo(o),set:function(a){w.element.attr("href",j.makeUrlAbsolute(a,
s))},reset:function(){w.element.attr("href",s.hrefNoHash)}}:d;a.fn.animationComplete=function(b){return a.support.cssTransitions?a(this).one("webkitAnimationEnd",b):(setTimeout(b,0),a(this))};a.mobile.updateHash=j.set;a.mobile.path=j;a.mobile.base=w;a.mobile.urlstack=n.stack;a.mobile.urlHistory=n;a.mobile.noneTransitionHandler=function(b,c,d,f){f&&f.removeClass(a.mobile.activePageClass);d.addClass(a.mobile.activePageClass);return a.Deferred().resolve(b,c,d,f).promise()};a.mobile.defaultTransitionHandler=
a.mobile.noneTransitionHandler;a.mobile.transitionHandlers={none:a.mobile.defaultTransitionHandler};a.mobile.allowCrossDomainPages=!1;a.mobile.getDocumentUrl=function(b){return b?a.extend({},u):u.href};a.mobile.getDocumentBase=function(b){return b?a.extend({},s):s.href};a.mobile.loadPage=function(b,c){var f=a.Deferred(),e=a.extend({},a.mobile.loadPage.defaults,c),g=null,h=null,p=j.makeUrlAbsolute(b,a.mobile.activePage&&l(a.mobile.activePage)||s.hrefNoHash);if(e.data&&e.type==="get")p=j.addSearchParams(p,
e.data),e.data=d;var n=j.getFilePath(p),o=j.convertUrlToDataUrl(p);e.pageContainer=e.pageContainer||a.mobile.pageContainer;g=e.pageContainer.children(":jqmData(url='"+o+"')");w&&w.reset();if(g.length){if(!e.reloadPage)return i(g,e.role),f.resolve(p,c,g),f.promise();h=g}if(e.showLoadMsg)var k=setTimeout(function(){a.mobile.showPageLoadingMsg()},e.loadMsgDelay);!a.mobile.allowCrossDomainPages&&!j.isSameDomain(u,p)?f.reject(p,c):a.ajax({url:n,type:e.type,data:e.data,dataType:"html",success:function(d){var l=
a("<div></div>"),q=d.match(/<title[^>]*>([^<]*)/)&&RegExp.$1,m=RegExp("\\bdata-"+a.mobile.ns+"url=[\"']?([^\"'>]*)[\"']?");RegExp(".*(<[^>]+\\bdata-"+a.mobile.ns+"role=[\"']?page[\"']?[^>]*>).*").test(d)&&RegExp.$1&&m.test(RegExp.$1)&&RegExp.$1&&(b=n=j.getFilePath(RegExp.$1));w&&w.set(n);l.get(0).innerHTML=d;g=l.find(":jqmData(role='page'), :jqmData(role='dialog')").first();g.length||(g=a("<div data-"+a.mobile.ns+"role='page'>"+d.split(/<\/?body[^>]*>/gmi)[1]+"</div>"));q&&!g.jqmData("title")&&g.jqmData("title",
q);if(!a.support.dynamicBaseTag){var s=j.get(n);g.find("[src], link[href], a[rel='external'], :jqmData(ajax='false'), a[target]").each(function(){var b=a(this).is("[href]")?"href":a(this).is("[src]")?"src":"action",c=a(this).attr(b),c=c.replace(location.protocol+"//"+location.host+location.pathname,"");/^(\w+:|#|\/)/.test(c)||a(this).attr(b,s+c)})}g.attr("data-"+a.mobile.ns+"url",j.convertUrlToDataUrl(n)).appendTo(e.pageContainer);g.one("pagecreate",function(){g.data("page").options.domCache||g.bind("pagehide.remove",
function(){a(this).remove()})});i(g,e.role);p.indexOf("&"+a.mobile.subPageUrlKey)>-1&&(g=e.pageContainer.children(":jqmData(url='"+o+"')"));e.showLoadMsg&&(clearTimeout(k),a.mobile.hidePageLoadingMsg());f.resolve(p,c,g,h)},error:function(){w&&w.set(j.get());e.showLoadMsg&&(clearTimeout(k),a.mobile.hidePageLoadingMsg(),a("<div class='ui-loader ui-overlay-shadow ui-body-e ui-corner-all'><h1>"+a.mobile.pageLoadErrorMessage+"</h1></div>").css({display:"block",opacity:0.96,top:m.scrollTop()+100}).appendTo(e.pageContainer).delay(800).fadeOut(400,
function(){a(this).remove()}));f.reject(p,c)}});return f.promise()};a.mobile.loadPage.defaults={type:"get",data:d,reloadPage:!1,role:d,showLoadMsg:!1,pageContainer:d,loadMsgDelay:50};a.mobile.changePage=function(c,g){if(typeof g!=="object"){var h=null;if(typeof c==="object"&&c.url&&c.type)h={type:c.type,data:c.data,forcePageLoad:!0},c=c.url;var o=arguments.length;if(o>1){var k=["transition","reverse","changeHash","fromHashChange"],l;for(l=1;l<o;l++){var q=arguments[l];typeof q!=="undefined"&&(h=h||
{},h[k[l-1]]=q)}}if(h)return a.mobile.changePage(c,h)}if(t)z.unshift(arguments);else{t=!0;var m=a.extend({},a.mobile.changePage.defaults,g);m.pageContainer=m.pageContainer||a.mobile.pageContainer;if(typeof c=="string")a.mobile.loadPage(c,m).done(function(b,c,d,f){t=!1;c.duplicateCachedPage=f;a.mobile.changePage(d,c)}).fail(function(){t=!1;b(!0);f();m.pageContainer.trigger("changepagefailed")});else{var s=m.pageContainer,h=a.mobile.activePage,k=o=c.jqmData("url");j.getFilePath(o);l=n.getActive();var q=
n.activeIndex===0,y=0,u=document.title,x=m.role==="dialog"||c.jqmData("role")==="dialog";s.trigger("beforechangepage");if(h&&h[0]===c[0])t=!1,s.trigger("changepage");else{i(c,m.role);m.fromHashChange&&n.directHashChange({currentUrl:o,isBack:function(){y=-1},isForward:function(){y=1}});try{a(document.activeElement||"").add("input:focus, textarea:focus, select:focus").blur()}catch(w){}x&&l&&(o=l.url+v);if(m.changeHash!==!1&&o)n.ignoreNextHashChange=!0,j.set(o);var A=c.jqmData("title")||c.children(":jqmData(role='header')").find(".ui-title").text();
A&&u==document.title&&(u=A);y||n.addNew(o,m.transition,u,k);document.title=n.getActive().title;a.mobile.activePage=c;m.transition=m.transition||(y&&!q?l.transition:d)||(x?a.mobile.defaultDialogTransition:a.mobile.defaultPageTransition);m.reverse=m.reverse||y<0;e(c,h,m.transition,m.reverse).done(function(){b();m.duplicateCachedPage&&m.duplicateCachedPage.remove();p.removeClass("ui-mobile-rendering");f();s.trigger("changepage")})}}}};a.mobile.changePage.defaults={transition:d,reverse:!1,changeHash:!0,
fromHashChange:!1,role:d,duplicateCachedPage:d,pageContainer:d,showLoadMsg:!0};a.mobile._registerInternalEvents=function(){a("form").live("submit",function(b){var c=a(this);if(a.mobile.ajaxEnabled&&!c.is(":jqmData(ajax='false')")){var d=c.attr("method"),f=c.attr("target"),e=c.attr("action");if(!e&&(e=l(c),e===s.hrefNoHash))e=u.hrefNoSearch;e=j.makeUrlAbsolute(e,l(c));!j.isExternal(e)&&!f&&(a.mobile.changePage(e,{type:d&&d.length&&d.toLowerCase()||"get",data:c.serialize(),transition:c.jqmData("transition"),
direction:c.jqmData("direction"),reloadPage:!0}),b.preventDefault())}});a(document).bind("vclick",function(b){if((b=k(b.target))&&j.parseUrl(b.getAttribute("href")||"#").hash!=="#")a(b).closest(".ui-btn").not(".ui-disabled").addClass(a.mobile.activeBtnClass),a("."+a.mobile.activePageClass+" .ui-btn").not(b).blur()});a(document).bind("click",function(c){var f=k(c.target);if(f){var e=a(f),g=function(){window.setTimeout(function(){b(!0)},200)};if(e.is(":jqmData(rel='back')"))return window.history.back(),
!1;if(a.mobile.ajaxEnabled){var h=l(e),f=j.makeUrlAbsolute(e.attr("href")||"#",h);if(f.search("#")!=-1)if(f=f.replace(/[^#]*#/,""))f=j.isPath(f)?j.makeUrlAbsolute(f,h):j.makeUrlAbsolute("#"+f,u.hrefNoHash);else{c.preventDefault();return}var h=e.is("[rel='external']")||e.is(":jqmData(ajax='false')")||e.is("[target]"),i=a.mobile.allowCrossDomainPages&&u.protocol==="file:"&&f.search(/^https?:/)!=-1,h=h||j.isExternal(f)&&!i;q=e.closest(".ui-btn");h?g():(g=e.jqmData("transition"),h=(h=e.jqmData("direction"))&&
h==="reverse"||e.jqmData("back"),e=e.attr("data-"+a.mobile.ns+"rel")||d,a.mobile.changePage(f,{transition:g,reverse:h,role:e}),c.preventDefault())}else g()}});a(".ui-page").live("pageshow.prefetch",function(){var b=[];a(this).find("a:jqmData(prefetch)").each(function(){var c=a(this).attr("href");c&&a.inArray(c,b)===-1&&(b.push(c),a.mobile.loadPage(c))})});m.bind("hashchange",function(){var b=j.stripHash(location.hash),c=a.mobile.urlHistory.stack.length===0?"none":d;if(!a.mobile.hashListeningEnabled||
n.ignoreNextHashChange)n.ignoreNextHashChange=!1;else{if(n.stack.length>1&&b.indexOf(v)>-1)if(a.mobile.activePage.is(".ui-dialog")){var f=function(){b=a.mobile.urlHistory.getActive().pageUrl};n.directHashChange({currentUrl:b,isBack:f,isForward:f})}else{n.directHashChange({currentUrl:b,isBack:function(){window.history.back()},isForward:function(){window.history.forward()}});return}b?(b=typeof b==="string"&&!j.isPath(b)?"#"+b:b,a.mobile.changePage(b,{transition:c,changeHash:!1,fromHashChange:!0})):
a.mobile.changePage(a.mobile.firstPage,{transition:c,changeHash:!1,fromHashChange:!0})}});a(document).bind("pageshow",h);a(window).bind("throttledresize",h)}})(jQuery);
(function(a){function d(c,b,d,e){var g=new a.Deferred,h=b?" reverse":"",i="ui-mobile-viewport-transitioning viewport-"+c;d.animationComplete(function(){d.add(e).removeClass("out in reverse "+c);e&&e.removeClass(a.mobile.activePageClass);d.parent().removeClass(i);g.resolve(c,b,d,e)});d.parent().addClass(i);e&&e.addClass(c+" out"+h);d.addClass(a.mobile.activePageClass+" "+c+" in"+h);return g.promise()}a.mobile.css3TransitionHandler=d;if(a.mobile.defaultTransitionHandler===a.mobile.noneTransitionHandler)a.mobile.defaultTransitionHandler=
d})(jQuery,this);
(function(a){a.mobile.page.prototype.options.degradeInputs={color:!1,date:!1,datetime:!1,"datetime-local":!1,email:!1,month:!1,number:!1,range:"number",search:!0,tel:!1,time:!1,url:!1,week:!1};a.mobile.page.prototype.options.keepNative=":jqmData(role='none'), :jqmData(role='nojs')";a(document).bind("pagecreate enhance",function(d){var c=a(d.target).data("page").options;a(d.target).find("input").not(c.keepNative).each(function(){var b=a(this),d=this.getAttribute("type"),e=c.degradeInputs[d]||"text";
c.degradeInputs[d]&&b.replaceWith(a("<div>").html(b.clone()).html().replace(/\s+type=["']?\w+['"]?/,' type="'+e+'" data-'+a.mobile.ns+'type="'+d+'" '))})})})(jQuery);
(function(a,d){a.widget("mobile.dialog",a.mobile.widget,{options:{closeBtnText:"Close",theme:"a",initSelector:":jqmData(role='dialog')"},_create:function(){var c=this.element,b=c.attr("class").match(/ui-body-[a-z]/);b.length&&c.removeClass(b[0]);c.addClass("ui-body-"+this.options.theme);c.attr("role","dialog").addClass("ui-dialog").find(":jqmData(role='header')").addClass("ui-corner-top ui-overlay-shadow").prepend("<a href='#' data-"+a.mobile.ns+"icon='delete' data-"+a.mobile.ns+"rel='back' data-"+
a.mobile.ns+"iconpos='notext'>"+this.options.closeBtnText+"</a>").end().find(":jqmData(role='content'),:jqmData(role='footer')").last().addClass("ui-corner-bottom ui-overlay-shadow");c.bind("vclick submit",function(b){var b=a(b.target).closest(b.type==="vclick"?"a":"form"),c;b.length&&!b.jqmData("transition")&&(c=a.mobile.urlHistory.getActive()||{},b.attr("data-"+a.mobile.ns+"transition",c.transition||a.mobile.defaultDialogTransition).attr("data-"+a.mobile.ns+"direction","reverse"))}).bind("pagehide",
function(){a(this).find("."+a.mobile.activeBtnClass).removeClass(a.mobile.activeBtnClass)})},close:function(){d.history.back()}});a(a.mobile.dialog.prototype.options.initSelector).live("pagecreate",function(){a(this).dialog()})})(jQuery,this);
(function(a){a.mobile.page.prototype.options.backBtnText="Back";a.mobile.page.prototype.options.addBackBtn=!1;a.mobile.page.prototype.options.backBtnTheme=null;a.mobile.page.prototype.options.headerTheme="a";a.mobile.page.prototype.options.footerTheme="a";a.mobile.page.prototype.options.contentTheme=null;a(":jqmData(role='page'), :jqmData(role='dialog')").live("pagecreate",function(){var d=a(this).data("page").options,c=d.theme;a(":jqmData(role='header'), :jqmData(role='footer'), :jqmData(role='content')",
this).each(function(){var b=a(this),f=b.jqmData("role"),e=b.jqmData("theme"),g,h,i;b.addClass("ui-"+f);if(f==="header"||f==="footer"){e=e||(f==="header"?d.headerTheme:d.footerTheme)||c;b.addClass("ui-bar-"+e);b.attr("role",f==="header"?"banner":"contentinfo");g=b.children("a");h=g.hasClass("ui-btn-left");i=g.hasClass("ui-btn-right");if(!h)h=g.eq(0).not(".ui-btn-right").addClass("ui-btn-left").length;i||g.eq(1).addClass("ui-btn-right");d.addBackBtn&&f==="header"&&a(".ui-page").length>1&&b.jqmData("url")!==
a.mobile.path.stripHash(location.hash)&&!h&&(f=a("<a href='#' class='ui-btn-left' data-"+a.mobile.ns+"rel='back' data-"+a.mobile.ns+"icon='arrow-l'>"+d.backBtnText+"</a>").prependTo(b),f.attr("data-"+a.mobile.ns+"theme",d.backBtnTheme||e));b.children("h1, h2, h3, h4, h5, h6").addClass("ui-title").attr({tabindex:"0",role:"heading","aria-level":"1"})}else f==="content"&&(b.addClass("ui-body-"+(e||c||d.contentTheme)),b.attr("role","main"))})})})(jQuery);
(function(a){a.widget("mobile.collapsible",a.mobile.widget,{options:{expandCueText:" click to expand contents",collapseCueText:" click to collapse contents",collapsed:!1,heading:">:header,>legend",theme:null,iconTheme:"d",initSelector:":jqmData(role='collapsible')"},_create:function(){var d=this.element,c=this.options,b=d.addClass("ui-collapsible-contain"),f=d.find(c.heading).eq(0),e=b.wrapInner("<div class='ui-collapsible-content'></div>").find(".ui-collapsible-content"),d=d.closest(":jqmData(role='collapsible-set')").addClass("ui-collapsible-set");
f.is("legend")&&(f=a("<div role='heading'>"+f.html()+"</div>").insertBefore(f),f.next().remove());f.insertBefore(e).addClass("ui-collapsible-heading").append("<span class='ui-collapsible-heading-status'></span>").wrapInner("<a href='#' class='ui-collapsible-heading-toggle'></a>").find("a:eq(0)").buttonMarkup({shadow:!d.length,corners:!1,iconPos:"left",icon:"plus",theme:c.theme}).find(".ui-icon").removeAttr("class").buttonMarkup({shadow:!0,corners:!0,iconPos:"notext",icon:"plus",theme:c.iconTheme});
d.length?b.jqmData("collapsible-last")&&f.find("a:eq(0), .ui-btn-inner").addClass("ui-corner-bottom"):f.find("a:eq(0)").addClass("ui-corner-all").find(".ui-btn-inner").addClass("ui-corner-all");b.bind("collapse",function(d){!d.isDefaultPrevented()&&a(d.target).closest(".ui-collapsible-contain").is(b)&&(d.preventDefault(),f.addClass("ui-collapsible-heading-collapsed").find(".ui-collapsible-heading-status").text(c.expandCueText).end().find(".ui-icon").removeClass("ui-icon-minus").addClass("ui-icon-plus"),
e.addClass("ui-collapsible-content-collapsed").attr("aria-hidden",!0),b.jqmData("collapsible-last")&&f.find("a:eq(0), .ui-btn-inner").addClass("ui-corner-bottom"))}).bind("expand",function(a){a.isDefaultPrevented()||(a.preventDefault(),f.removeClass("ui-collapsible-heading-collapsed").find(".ui-collapsible-heading-status").text(c.collapseCueText),f.find(".ui-icon").removeClass("ui-icon-plus").addClass("ui-icon-minus"),e.removeClass("ui-collapsible-content-collapsed").attr("aria-hidden",!1),b.jqmData("collapsible-last")&&
f.find("a:eq(0), .ui-btn-inner").removeClass("ui-corner-bottom"))}).trigger(c.collapsed?"collapse":"expand");d.length&&!d.jqmData("collapsiblebound")&&(d.jqmData("collapsiblebound",!0).bind("expand",function(b){a(b.target).closest(".ui-collapsible-contain").siblings(".ui-collapsible-contain").trigger("collapse")}),d=d.children(":jqmData(role='collapsible')"),d.first().find("a:eq(0)").addClass("ui-corner-top").find(".ui-btn-inner").addClass("ui-corner-top"),d.last().jqmData("collapsible-last",!0));
f.bind("vclick",function(a){var c=f.is(".ui-collapsible-heading-collapsed")?"expand":"collapse";b.trigger(c);a.preventDefault()})}});a(document).bind("pagecreate create",function(d){a(a.mobile.collapsible.prototype.options.initSelector,d.target).collapsible()})})(jQuery);(function(a){a.fn.fieldcontain=function(){return this.addClass("ui-field-contain ui-body ui-br")};a(document).bind("pagecreate create",function(d){a(":jqmData(role='fieldcontain')",d.target).fieldcontain()})})(jQuery);
(function(a){a.fn.grid=function(d){return this.each(function(){var c=a(this),b=a.extend({grid:null},d),f=c.children(),e={solo:1,a:2,b:3,c:4,d:5},b=b.grid;if(!b)if(f.length<=5)for(var g in e)e[g]===f.length&&(b=g);else b="a";e=e[b];c.addClass("ui-grid-"+b);f.filter(":nth-child("+e+"n+1)").addClass("ui-block-a");e>1&&f.filter(":nth-child("+e+"n+2)").addClass("ui-block-b");e>2&&f.filter(":nth-child(3n+3)").addClass("ui-block-c");e>3&&f.filter(":nth-child(4n+4)").addClass("ui-block-d");e>4&&f.filter(":nth-child(5n+5)").addClass("ui-block-e")})}})(jQuery);
(function(a,d){a.widget("mobile.navbar",a.mobile.widget,{options:{iconpos:"top",grid:null,initSelector:":jqmData(role='navbar')"},_create:function(){var c=this.element,b=c.find("a"),f=b.filter(":jqmData(icon)").length?this.options.iconpos:d;c.addClass("ui-navbar").attr("role","navigation").find("ul").grid({grid:this.options.grid});f||c.addClass("ui-navbar-noicons");b.buttonMarkup({corners:!1,shadow:!1,iconpos:f});c.delegate("a","vclick",function(){b.not(".ui-state-persist").removeClass(a.mobile.activeBtnClass);
a(this).addClass(a.mobile.activeBtnClass)})}});a(document).bind("pagecreate create",function(c){a(a.mobile.navbar.prototype.options.initSelector,c.target).navbar()})})(jQuery);
(function(a){var d={};a.widget("mobile.listview",a.mobile.widget,{options:{theme:"c",countTheme:"c",headerTheme:"b",dividerTheme:"b",splitIcon:"arrow-r",splitTheme:"b",inset:!1,initSelector:":jqmData(role='listview')"},_create:function(){var a=this;a.element.addClass(function(b,d){return d+" ui-listview "+(a.options.inset?" ui-listview-inset ui-corner-all ui-shadow ":"")});a.refresh()},_itemApply:function(c,b){b.find(".ui-li-count").addClass("ui-btn-up-"+(c.jqmData("counttheme")||this.options.countTheme)+
" ui-btn-corner-all").end().find("h1, h2, h3, h4, h5, h6").addClass("ui-li-heading").end().find("p, dl").addClass("ui-li-desc").end().find(">img:eq(0), .ui-link-inherit>img:eq(0)").addClass("ui-li-thumb").each(function(){b.addClass(a(this).is(".ui-li-icon")?"ui-li-has-icon":"ui-li-has-thumb")}).end().find(".ui-li-aside").each(function(){var b=a(this);b.prependTo(b.parent())})},_removeCorners:function(a,b){a=a.add(a.find(".ui-btn-inner, .ui-li-link-alt, .ui-li-thumb"));b==="top"?a.removeClass("ui-corner-top ui-corner-tr ui-corner-tl"):
b==="bottom"?a.removeClass("ui-corner-bottom ui-corner-br ui-corner-bl"):a.removeClass("ui-corner-top ui-corner-tr ui-corner-tl ui-corner-bottom ui-corner-br ui-corner-bl")},refresh:function(c){this.parentPage=this.element.closest(".ui-page");this._createSubPages();var b=this.options,d=this.element,e=d.jqmData("dividertheme")||b.dividerTheme,g=d.jqmData("splittheme"),h=d.jqmData("spliticon"),i=d.children("li"),k=a.support.cssPseudoElement||!a.nodeName(d[0],"ol")?0:1,l,m,p,o,j;k&&d.find(".ui-li-dec").remove();
for(var q=0,n=i.length;q<n;q++){l=i.eq(q);m="ui-li";if(c||!l.hasClass("ui-li"))p=l.jqmData("theme")||b.theme,o=l.children("a"),o.length?(j=l.jqmData("icon"),l.buttonMarkup({wrapperEls:"div",shadow:!1,corners:!1,iconpos:"right",icon:o.length>1||j===!1?!1:j||"arrow-r",theme:p}),o.first().addClass("ui-link-inherit"),o.length>1&&(m+=" ui-li-has-alt",o=o.last(),j=g||o.jqmData("theme")||b.splitTheme,o.appendTo(l).attr("title",o.text()).addClass("ui-li-link-alt").empty().buttonMarkup({shadow:!1,corners:!1,
theme:p,icon:!1,iconpos:!1}).find(".ui-btn-inner").append(a("<span />").buttonMarkup({shadow:!0,corners:!0,theme:j,iconpos:"notext",icon:h||o.jqmData("icon")||b.splitIcon})))):l.jqmData("role")==="list-divider"?(m+=" ui-li-divider ui-btn ui-bar-"+e,l.attr("role","heading"),k&&(k=1)):m+=" ui-li-static ui-body-"+p;b.inset&&(q===0&&(m+=" ui-corner-top",l.add(l.find(".ui-btn-inner")).find(".ui-li-link-alt").addClass("ui-corner-tr").end().find(".ui-li-thumb").addClass("ui-corner-tl"),l.next().next().length&&
this._removeCorners(l.next())),q===i.length-1&&(m+=" ui-corner-bottom",l.add(l.find(".ui-btn-inner")).find(".ui-li-link-alt").addClass("ui-corner-br").end().find(".ui-li-thumb").addClass("ui-corner-bl"),l.prev().prev().length?this._removeCorners(l.prev()):l.prev().length&&this._removeCorners(l.prev(),"bottom")));k&&m.indexOf("ui-li-divider")<0&&(p=l.is(".ui-li-static:first")?l:l.find(".ui-link-inherit"),p.addClass("ui-li-jsnumbering").prepend("<span class='ui-li-dec'>"+k++ +". </span>"));l.add(l.children(".ui-btn-inner")).addClass(m);
c||this._itemApply(d,l)}},_idStringEscape:function(a){return a.replace(/[^a-zA-Z0-9]/g,"-")},_createSubPages:function(){var c=this.element,b=c.closest(".ui-page"),f=b.jqmData("url"),e=f||b[0][a.expando],g=c.attr("id"),h=this.options,i="data-"+a.mobile.ns,k=this,l=b.find(":jqmData(role='footer')").jqmData("id"),m;typeof d[e]==="undefined"&&(d[e]=-1);g=g||++d[e];a(c.find("li>ul, li>ol").toArray().reverse()).each(function(b){var d=a(this),e=d.attr("id")||g+"-"+b,b=d.parent(),k=a(d.prevAll().toArray().reverse()),
k=k.length?k:a("<span>"+a.trim(b.contents()[0].nodeValue)+"</span>"),n=k.first().text(),e=(f||"")+"&"+a.mobile.subPageUrlKey+"="+e,x=d.jqmData("theme")||h.theme,z=d.jqmData("counttheme")||c.jqmData("counttheme")||h.countTheme;m=!0;d.detach().wrap("<div "+i+"role='page' "+i+"url='"+e+"' "+i+"theme='"+x+"' "+i+"count-theme='"+z+"'><div "+i+"role='content'></div></div>").parent().before("<div "+i+"role='header' "+i+"theme='"+h.headerTheme+"'><div class='ui-title'>"+n+"</div></div>").after(l?a("<div "+
i+"role='footer' "+i+"id='"+l+"'>"):"").parent().appendTo(a.mobile.pageContainer).page();d=b.find("a:first");d.length||(d=a("<a/>").html(k||n).prependTo(b.empty()));d.attr("href","#"+e)}).listview();m&&b.data("page").options.domCache===!1&&b.unbind("pagehide.remove").bind("pagehide.remove",function(c,d){var e=d.nextPage;d.nextPage&&(e=e.jqmData("url"),e.indexOf(f+"&"+a.mobile.subPageUrlKey)!==0&&(k.childPages().remove(),b.remove()))})},childPages:function(){var c=this.parentPage.jqmData("url");return a(":jqmData(url^='"+
c+"&"+a.mobile.subPageUrlKey+"')")}});a(document).bind("pagecreate create",function(c){a(a.mobile.listview.prototype.options.initSelector,c.target).listview()})})(jQuery);
(function(a){a.mobile.listview.prototype.options.filter=!1;a.mobile.listview.prototype.options.filterPlaceholder="Filter items...";a.mobile.listview.prototype.options.filterTheme="c";a(":jqmData(role='listview')").live("listviewcreate",function(){var d=a(this),c=d.data("listview");if(c.options.filter){var b=a("<form>",{"class":"ui-listview-filter ui-bar-"+c.options.filterTheme,role:"search"});a("<input>",{placeholder:c.options.filterPlaceholder}).attr("data-"+a.mobile.ns+"type","search").jqmData("lastval",
"").bind("keyup change",function(){var b=a(this),c=this.value.toLowerCase(),g=null,g=b.jqmData("lastval")+"",h=!1,i="";b.jqmData("lastval",c);change=c.replace(RegExp("^"+g),"");g=c.length<g.length||change.length!=c.length-g.length?d.children():d.children(":not(.ui-screen-hidden)");if(c){for(var k=g.length-1;k>=0;k--)b=a(g[k]),i=b.jqmData("filtertext")||b.text(),b.is("li:jqmData(role=list-divider)")?(b.toggleClass("ui-filter-hidequeue",!h),h=!1):i.toLowerCase().indexOf(c)===-1?b.toggleClass("ui-filter-hidequeue",
!0):h=!0;g.filter(":not(.ui-filter-hidequeue)").toggleClass("ui-screen-hidden",!1);g.filter(".ui-filter-hidequeue").toggleClass("ui-screen-hidden",!0).toggleClass("ui-filter-hidequeue",!1)}else g.toggleClass("ui-screen-hidden",!1)}).appendTo(b).textinput();a(this).jqmData("inset")&&b.addClass("ui-listview-filter-inset");b.bind("submit",function(){return!1}).insertBefore(d)}})})(jQuery);(function(a){a(document).bind("pagecreate create",function(d){a(":jqmData(role='nojs')",d.target).addClass("ui-nojs")})})(jQuery);
(function(a,d){a.widget("mobile.checkboxradio",a.mobile.widget,{options:{theme:null,initSelector:"input[type='checkbox'],input[type='radio']"},_create:function(){var c=this,b=this.element,f=b.closest("form,fieldset,:jqmData(role='page')").find("label").filter("[for='"+b[0].id+"']"),e=b.attr("type"),g=e+"-on",h=e+"-off",i=b.parents(":jqmData(type='horizontal')").length?d:h;if(!(e!=="checkbox"&&e!=="radio")){a.extend(this,{label:f,inputtype:e,checkedClass:"ui-"+g+(i?"":" "+a.mobile.activeBtnClass),
uncheckedClass:"ui-"+h,checkedicon:"ui-icon-"+g,uncheckedicon:"ui-icon-"+h});if(!this.options.theme)this.options.theme=this.element.jqmData("theme");f.buttonMarkup({theme:this.options.theme,icon:i,shadow:!1});b.add(f).wrapAll("<div class='ui-"+e+"'></div>");f.bind({vmouseover:function(){if(a(this).parent().is(".ui-disabled"))return!1},vclick:function(a){if(b.is(":disabled"))a.preventDefault();else return c._cacheVals(),b.prop("checked",e==="radio"&&!0||!b.prop("checked")),c._getInputSet().not(b).prop("checked",
!1),c._updateAll(),!1}});b.bind({vmousedown:function(){this._cacheVals()},vclick:function(){var b=a(this);b.is(":checked")?(b.prop("checked",!0),c._getInputSet().not(b).prop("checked",!1)):b.prop("checked",!1);c._updateAll()},focus:function(){f.addClass("ui-focus")},blur:function(){f.removeClass("ui-focus")}});this.refresh()}},_cacheVals:function(){this._getInputSet().each(function(){var c=a(this);c.jqmData("cacheVal",c.is(":checked"))})},_getInputSet:function(){if(this.inputtype=="checkbox")return this.element;
return this.element.closest("form,fieldset,:jqmData(role='page')").find("input[name='"+this.element.attr("name")+"'][type='"+this.inputtype+"']")},_updateAll:function(){var c=this;this._getInputSet().each(function(){var b=a(this);(b.is(":checked")||c.inputtype==="checkbox")&&b.trigger("change")}).checkboxradio("refresh")},refresh:function(){var c=this.element,b=this.label,d=b.find(".ui-icon");a(c[0]).prop("checked")?(b.addClass(this.checkedClass).removeClass(this.uncheckedClass),d.addClass(this.checkedicon).removeClass(this.uncheckedicon)):
(b.removeClass(this.checkedClass).addClass(this.uncheckedClass),d.removeClass(this.checkedicon).addClass(this.uncheckedicon));c.is(":disabled")?this.disable():this.enable()},disable:function(){this.element.prop("disabled",!0).parent().addClass("ui-disabled")},enable:function(){this.element.prop("disabled",!1).parent().removeClass("ui-disabled")}});a(document).bind("pagecreate create",function(c){a(a.mobile.checkboxradio.prototype.options.initSelector,c.target).not(":jqmData(role='none'), :jqmData(role='nojs')").checkboxradio()})})(jQuery);
(function(a){a.widget("mobile.button",a.mobile.widget,{options:{theme:null,icon:null,iconpos:null,inline:null,corners:!0,shadow:!0,iconshadow:!0,initSelector:"button, [type='button'], [type='submit'], [type='reset'], [type='image']"},_create:function(){var d=this.element,c=this.options;this.button=a("<div></div>").text(d.text()||d.val()).buttonMarkup({theme:c.theme,icon:c.icon,iconpos:c.iconpos,inline:c.inline,corners:c.corners,shadow:c.shadow,iconshadow:c.iconshadow}).insertBefore(d).append(d.addClass("ui-btn-hidden"));
c=d.attr("type");c!=="button"&&c!=="reset"&&d.bind("vclick",function(){var b=a("<input>",{type:"hidden",name:d.attr("name"),value:d.attr("value")}).insertBefore(d);a(document).submit(function(){b.remove()})});this.refresh()},enable:function(){this.element.attr("disabled",!1);this.button.removeClass("ui-disabled").attr("aria-disabled",!1);return this._setOption("disabled",!1)},disable:function(){this.element.attr("disabled",!0);this.button.addClass("ui-disabled").attr("aria-disabled",!0);return this._setOption("disabled",
!0)},refresh:function(){this.element.attr("disabled")?this.disable():this.enable()}});a(document).bind("pagecreate create",function(d){a(a.mobile.button.prototype.options.initSelector,d.target).not(":jqmData(role='none'), :jqmData(role='nojs')").button()})})(jQuery);
(function(a,d){a.widget("mobile.slider",a.mobile.widget,{options:{theme:null,trackTheme:null,disabled:!1,initSelector:"input[type='range'], :jqmData(type='range'), :jqmData(role='slider')"},_create:function(){var c=this,b=this.element,f=b.parents("[class*='ui-bar-'],[class*='ui-body-']").eq(0),f=f.length?f.attr("class").match(/ui-(bar|body)-([a-z])/)[2]:"c",e=this.options.theme?this.options.theme:f,g=this.options.trackTheme?this.options.trackTheme:f,h=b[0].nodeName.toLowerCase(),f=h=="select"?"ui-slider-switch":
"",i=b.attr("id"),k=i+"-label",i=a("[for='"+i+"']").attr("id",k),l=function(){return h=="input"?parseFloat(b.val()):b[0].selectedIndex},m=h=="input"?parseFloat(b.attr("min")):0,p=h=="input"?parseFloat(b.attr("max")):b.find("option").length-1,o=window.parseFloat(b.attr("step")||1),j=a("<div class='ui-slider "+f+" ui-btn-down-"+g+" ui-btn-corner-all' role='application'></div>"),q=a("<a href='#' class='ui-slider-handle'></a>").appendTo(j).buttonMarkup({corners:!0,theme:e,shadow:!0}).attr({role:"slider",
"aria-valuemin":m,"aria-valuemax":p,"aria-valuenow":l(),"aria-valuetext":l(),title:l(),"aria-labelledby":k});a.extend(this,{slider:j,handle:q,dragging:!1,beforeStart:null});h=="select"&&(j.wrapInner("<div class='ui-slider-inneroffset'></div>"),b.find("option"),b.find("option").each(function(b){var c=!b?"b":"a",d=!b?"right":"left",b=!b?" ui-btn-down-"+g:" ui-btn-active";a("<div class='ui-slider-labelbg ui-slider-labelbg-"+c+b+" ui-btn-corner-"+d+"'></div>").prependTo(j);a("<span class='ui-slider-label ui-slider-label-"+
c+b+" ui-btn-corner-"+d+"' role='img'>"+a(this).text()+"</span>").prependTo(q)}));i.addClass("ui-slider");b.addClass(h==="input"?"ui-slider-input":"ui-slider-switch").change(function(){c.refresh(l(),!0)}).keyup(function(){c.refresh(l(),!0,!0)}).blur(function(){c.refresh(l(),!0)});a(document).bind("vmousemove",function(a){if(c.dragging)return c.refresh(a),!1});j.bind("vmousedown",function(a){c.dragging=!0;if(h==="select")c.beforeStart=b[0].selectedIndex;c.refresh(a);return!1});j.add(document).bind("vmouseup",
function(){if(c.dragging){c.dragging=!1;if(h==="select"){c.beforeStart===b[0].selectedIndex&&c.refresh(!c.beforeStart?1:0);var a=l(),a=Math.round(a/(p-m)*100);q.addClass("ui-slider-handle-snapping").css("left",a+"%").animationComplete(function(){q.removeClass("ui-slider-handle-snapping")})}return!1}});j.insertAfter(b);this.handle.bind("vmousedown",function(){a(this).focus()}).bind("vclick",!1);this.handle.bind("keydown",function(b){var d=l();if(!c.options.disabled){switch(b.keyCode){case a.mobile.keyCode.HOME:case a.mobile.keyCode.END:case a.mobile.keyCode.PAGE_UP:case a.mobile.keyCode.PAGE_DOWN:case a.mobile.keyCode.UP:case a.mobile.keyCode.RIGHT:case a.mobile.keyCode.DOWN:case a.mobile.keyCode.LEFT:if(b.preventDefault(),
!c._keySliding)c._keySliding=!0,a(this).addClass("ui-state-active")}switch(b.keyCode){case a.mobile.keyCode.HOME:c.refresh(m);break;case a.mobile.keyCode.END:c.refresh(p);break;case a.mobile.keyCode.PAGE_UP:case a.mobile.keyCode.UP:case a.mobile.keyCode.RIGHT:c.refresh(d+o);break;case a.mobile.keyCode.PAGE_DOWN:case a.mobile.keyCode.DOWN:case a.mobile.keyCode.LEFT:c.refresh(d-o)}}}).keyup(function(){if(c._keySliding)c._keySliding=!1,a(this).removeClass("ui-state-active")});this.refresh(d,d,!0)},refresh:function(a,
b,d){if(!this.options.disabled){var e=this.element,g=e[0].nodeName.toLowerCase(),h=g==="input"?parseFloat(e.attr("min")):0,i=g==="input"?parseFloat(e.attr("max")):e.find("option").length-1;if(typeof a==="object"){if(!this.dragging||a.pageX<this.slider.offset().left-8||a.pageX>this.slider.offset().left+this.slider.width()+8)return;a=Math.round((a.pageX-this.slider.offset().left)/this.slider.width()*100)}else a==null&&(a=g==="input"?parseFloat(e.val()):e[0].selectedIndex),a=(parseFloat(a)-h)/(i-h)*
100;if(!isNaN(a)){a<0&&(a=0);a>100&&(a=100);var k=Math.round(a/100*(i-h))+h;k<h&&(k=h);k>i&&(k=i);this.handle.css("left",a+"%");this.handle.attr({"aria-valuenow":g==="input"?k:e.find("option").eq(k).attr("value"),"aria-valuetext":g==="input"?k:e.find("option").eq(k).text(),title:k});g==="select"&&(k===0?this.slider.addClass("ui-slider-switch-a").removeClass("ui-slider-switch-b"):this.slider.addClass("ui-slider-switch-b").removeClass("ui-slider-switch-a"));if(!d)g==="input"?e.val(k):e[0].selectedIndex=
k,b||e.trigger("change")}}},enable:function(){this.element.attr("disabled",!1);this.slider.removeClass("ui-disabled").attr("aria-disabled",!1);return this._setOption("disabled",!1)},disable:function(){this.element.attr("disabled",!0);this.slider.addClass("ui-disabled").attr("aria-disabled",!0);return this._setOption("disabled",!0)}});a(document).bind("pagecreate create",function(c){a(a.mobile.slider.prototype.options.initSelector,c.target).not(":jqmData(role='none'), :jqmData(role='nojs')").slider()})})(jQuery);
(function(a){a.widget("mobile.textinput",a.mobile.widget,{options:{theme:null,initSelector:"input[type='text'], input[type='search'], :jqmData(type='search'), input[type='number'], :jqmData(type='number'), input[type='password'], input[type='email'], input[type='url'], input[type='tel'], textarea"},_create:function(){var i;var d=this.element,c=this.options,b=c.theme,f,e;b||(b=this.element.closest("[class*='ui-bar-'],[class*='ui-body-']"),i=(b=b.length&&/ui-(bar|body)-([a-z])/.exec(b.attr("class")))&&
b[2]||"c",b=i);b=" ui-body-"+b;a("label[for='"+d.attr("id")+"']").addClass("ui-input-text");d.addClass("ui-input-text ui-body-"+c.theme);f=d;typeof d[0].autocorrect!=="undefined"&&(d[0].setAttribute("autocorrect","off"),d[0].setAttribute("autocomplete","off"));d.is("[type='search'],:jqmData(type='search')")?(f=d.wrap("<div class='ui-input-search ui-shadow-inset ui-btn-corner-all ui-btn-shadow ui-icon-searchfield"+b+"'></div>").parent(),e=a("<a href='#' class='ui-input-clear' title='clear text'>clear text</a>").tap(function(a){d.val("").focus();
d.trigger("change");e.addClass("ui-input-clear-hidden");a.preventDefault()}).appendTo(f).buttonMarkup({icon:"delete",iconpos:"notext",corners:!0,shadow:!0}),c=function(){d.val()?e.removeClass("ui-input-clear-hidden"):e.addClass("ui-input-clear-hidden")},c(),d.keyup(c).focus(c)):d.addClass("ui-corner-all ui-shadow-inset"+b);d.focus(function(){f.addClass("ui-focus")}).blur(function(){f.removeClass("ui-focus")});if(d.is("textarea")){var g=function(){var a=d[0].scrollHeight;d[0].clientHeight<a&&d.css({height:a+
15})},h;d.keyup(function(){clearTimeout(h);h=setTimeout(g,100)})}},disable:function(){(this.element.attr("disabled",!0).is("[type='search'],:jqmData(type='search')")?this.element.parent():this.element).addClass("ui-disabled")},enable:function(){(this.element.attr("disabled",!1).is("[type='search'],:jqmData(type='search')")?this.element.parent():this.element).removeClass("ui-disabled")}});a(document).bind("pagecreate create",function(d){a(a.mobile.textinput.prototype.options.initSelector,d.target).not(":jqmData(role='none'), :jqmData(role='nojs')").textinput()})})(jQuery);
(function(a){a.widget("mobile.selectmenu",a.mobile.widget,{options:{theme:null,disabled:!1,icon:"arrow-d",iconpos:"right",inline:null,corners:!0,shadow:!0,iconshadow:!0,menuPageTheme:"b",overlayTheme:"a",hidePlaceholderMenuItems:!0,closeText:"Close",nativeMenu:!0,initSelector:"select:not(:jqmData(role='slider'))"},_create:function(){var d=this,c=this.options,b=this.element.wrap("<div class='ui-select'>"),f=b.attr("id"),e=a("label[for='"+f+"']").addClass("ui-select"),g=b[0].selectedIndex==-1?0:b[0].selectedIndex,
h=(d.options.nativeMenu?a("<div/>"):a("<a>",{href:"#",role:"button",id:l,"aria-haspopup":"true","aria-owns":m})).text(a(b[0].options.item(g)).text()).insertBefore(b).buttonMarkup({theme:c.theme,icon:c.icon,iconpos:c.iconpos,inline:c.inline,corners:c.corners,shadow:c.shadow,iconshadow:c.iconshadow}),i=d.isMultiple=b[0].multiple;c.nativeMenu&&window.opera&&window.opera.version&&b.addClass("ui-select-nativeonly");if(!c.nativeMenu){var k=b.find("option"),l=f+"-button",m=f+"-menu",p=b.closest(".ui-page"),
g=/ui-btn-up-([a-z])/.exec(h.attr("class"))[1],o=a("<div data-"+a.mobile.ns+"role='dialog' data-"+a.mobile.ns+"theme='"+c.menuPageTheme+"'><div data-"+a.mobile.ns+"role='header'><div class='ui-title'>"+e.text()+"</div></div><div data-"+a.mobile.ns+"role='content'></div></div>").appendTo(a.mobile.pageContainer).page(),j=o.find(".ui-content");o.find(".ui-header a");var q=a("<div>",{"class":"ui-selectmenu-screen ui-screen-hidden"}).appendTo(p),n=a("<div>",{"class":"ui-selectmenu ui-selectmenu-hidden ui-overlay-shadow ui-corner-all ui-body-"+
c.overlayTheme+" "+a.mobile.defaultDialogTransition}).insertAfter(q),x=a("<ul>",{"class":"ui-selectmenu-list",id:m,role:"listbox","aria-labelledby":l}).attr("data-"+a.mobile.ns+"theme",g).appendTo(n),z=a("<div>",{"class":"ui-header ui-bar-"+g}).prependTo(n),t=a("<h1>",{"class":"ui-title"}).appendTo(z),v=a("<a>",{text:c.closeText,href:"#","class":"ui-btn-left"}).attr("data-"+a.mobile.ns+"iconpos","notext").attr("data-"+a.mobile.ns+"icon","delete").appendTo(z).buttonMarkup()}if(i)d.buttonCount=a("<span>").addClass("ui-li-count ui-btn-up-c ui-btn-corner-all").hide().appendTo(h);
c.disabled&&this.disable();b.change(function(){d.refresh()});a.extend(d,{select:b,optionElems:k,selectID:f,label:e,buttonId:l,menuId:m,thisPage:p,button:h,menuPage:o,menuPageContent:j,screen:q,listbox:n,list:x,menuType:void 0,header:z,headerClose:v,headerTitle:t,placeholder:""});c.nativeMenu?b.appendTo(h).bind("vmousedown",function(){h.addClass(a.mobile.activeBtnClass)}).bind("focus vmouseover",function(){h.trigger("vmouseover")}).bind("vmousemove",function(){h.removeClass(a.mobile.activeBtnClass)}).bind("change blur vmouseout",
function(){h.trigger("vmouseout").removeClass(a.mobile.activeBtnClass)}):(d.refresh(),b.attr("tabindex","-1").focus(function(){a(this).blur();h.focus()}),h.bind("vclick keydown",function(b){if(b.type=="vclick"||b.keyCode&&(b.keyCode===a.mobile.keyCode.ENTER||b.keyCode===a.mobile.keyCode.SPACE))d.open(),b.preventDefault()}),x.attr("role","listbox").delegate(".ui-li>a","focusin",function(){a(this).attr("tabindex","0")}).delegate(".ui-li>a","focusout",function(){a(this).attr("tabindex","-1")}).delegate("li:not(.ui-disabled, .ui-li-divider)",
"vclick",function(c){var e=a(this),f=b[0].selectedIndex,g=e.jqmData("option-index"),h=d.optionElems[g];h.selected=i?!h.selected:!0;i&&e.find(".ui-icon").toggleClass("ui-icon-checkbox-on",h.selected).toggleClass("ui-icon-checkbox-off",!h.selected);(i||f!==g)&&b.trigger("change");i||d.close();c.preventDefault()}).keydown(function(b){var c=a(b.target),d=c.closest("li");switch(b.keyCode){case 38:return b=d.prev(),b.length&&(c.blur().attr("tabindex","-1"),b.find("a").first().focus()),!1;case 40:return b=
d.next(),b.length&&(c.blur().attr("tabindex","-1"),b.find("a").first().focus()),!1;case 13:case 32:return c.trigger("vclick"),!1}}),d.menuPage.bind("pagehide",function(){d.list.appendTo(d.listbox);d._focusButton()}),q.bind("vclick",function(){d.close()}),d.headerClose.click(function(){if(d.menuType=="overlay")return d.close(),!1}))},_buildList:function(){var d=this,c=this.options,b=this.placeholder,f=[],e=[],g=d.isMultiple?"checkbox-off":"false";d.list.empty().filter(".ui-listview").listview("destroy");
d.select.find("option").each(function(h){var i=a(this),k=i.parent(),l=i.text(),m="<a href='#'>"+l+"</a>",p=[],o=[];k.is("optgroup")&&(k=k.attr("label"),a.inArray(k,f)===-1&&(e.push("<li data-"+a.mobile.ns+"role='list-divider'>"+k+"</li>"),f.push(k)));if(!this.getAttribute("value")||l.length==0||i.jqmData("placeholder"))c.hidePlaceholderMenuItems&&p.push("ui-selectmenu-placeholder"),b=d.placeholder=l;this.disabled&&(p.push("ui-disabled"),o.push("aria-disabled='true'"));e.push("<li data-"+a.mobile.ns+
"option-index='"+h+"' data-"+a.mobile.ns+"icon='"+g+"' class='"+p.join(" ")+"' "+o.join(" ")+">"+m+"</li>")});d.list.html(e.join(" "));d.list.find("li").attr({role:"option",tabindex:"-1"}).first().attr("tabindex","0");this.isMultiple||this.headerClose.hide();!this.isMultiple&&!b.length?this.header.hide():this.headerTitle.text(this.placeholder);d.list.listview()},refresh:function(d){var c=this,b=this.element,f=this.isMultiple,e=this.optionElems=b.find("option"),g=e.filter(":selected"),h=g.map(function(){return e.index(this)}).get();
!c.options.nativeMenu&&(d||b[0].options.length!=c.list.find("li").length)&&c._buildList();c.button.find(".ui-btn-text").text(function(){if(!f)return g.text();return g.length?g.map(function(){return a(this).text()}).get().join(", "):c.placeholder});f&&c.buttonCount[g.length>1?"show":"hide"]().text(g.length);c.options.nativeMenu||c.list.find("li:not(.ui-li-divider)").removeClass(a.mobile.activeBtnClass).attr("aria-selected",!1).each(function(b){a.inArray(b,h)>-1&&(b=a(this).addClass(a.mobile.activeBtnClass),
b.find("a").attr("aria-selected",!0),f&&b.find(".ui-icon").removeClass("ui-icon-checkbox-off").addClass("ui-icon-checkbox-on"))})},open:function(){function d(){c.list.find(".ui-btn-active").focus()}if(!this.options.disabled&&!this.options.nativeMenu){var c=this,b=c.list.parent().outerHeight(),f=c.list.parent().outerWidth(),e=a(window).scrollTop(),g=c.button.offset().top,h=window.innerHeight,i=window.innerWidth;c.button.addClass(a.mobile.activeBtnClass);setTimeout(function(){c.button.removeClass(a.mobile.activeBtnClass)},
300);if(b>h-80||!a.support.scrollTop){c.thisPage.unbind("pagehide.remove");if(e==0&&g>h)c.thisPage.one("pagehide",function(){a(this).jqmData("lastScroll",g)});c.menuPage.one("pageshow",function(){a(window).one("silentscroll",function(){d()});c.isOpen=!0});c.menuType="page";c.menuPageContent.append(c.list);a.mobile.changePage(c.menuPage,{transition:a.mobile.defaultDialogTransition})}else{c.menuType="overlay";c.screen.height(a(document).height()).removeClass("ui-screen-hidden");var k=g-e,l=e+h-g,m=
b/2,p=parseFloat(c.list.parent().css("max-width")),b=k>b/2&&l>b/2?g+c.button.outerHeight()/2-m:k>l?e+h-b-30:e+30;f<p?p=(i-f)/2:(p=c.button.offset().left+c.button.outerWidth()/2-f/2,p<30?p=30:p+f>i&&(p=i-f-30));c.listbox.append(c.list).removeClass("ui-selectmenu-hidden").css({top:b,left:p}).addClass("in");d();c.isOpen=!0}}},_focusButton:function(){var a=this;setTimeout(function(){a.button.focus()},40)},close:function(){if(!this.options.disabled&&this.isOpen&&!this.options.nativeMenu)this.menuType==
"page"?(this.thisPage.bind("pagehide.remove",function(){a(this).remove()}),window.history.back()):(this.screen.addClass("ui-screen-hidden"),this.listbox.addClass("ui-selectmenu-hidden").removeAttr("style").removeClass("in"),this.list.appendTo(this.listbox),this._focusButton()),this.isOpen=!1},disable:function(){this.element.attr("disabled",!0);this.button.addClass("ui-disabled").attr("aria-disabled",!0);return this._setOption("disabled",!0)},enable:function(){this.element.attr("disabled",!1);this.button.removeClass("ui-disabled").attr("aria-disabled",
!1);return this._setOption("disabled",!1)}});a(document).bind("pagecreate create",function(d){a(a.mobile.selectmenu.prototype.options.initSelector,d.target).not(":jqmData(role='none'), :jqmData(role='nojs')").selectmenu()})})(jQuery);
(function(a){function d(b){for(;b;){var c=a(b);if(c.hasClass("ui-btn")&&!c.hasClass("ui-disabled"))break;b=b.parentNode}return b}a.fn.buttonMarkup=function(b){return this.each(function(){var d=a(this),e=a.extend({},a.fn.buttonMarkup.defaults,d.jqmData(),b),g="ui-btn-inner",h,i;c&&c();if(!e.theme)h=d.closest("[class*='ui-bar-'],[class*='ui-body-']"),e.theme=h.length?/ui-(bar|body)-([a-z])/.exec(h.attr("class"))[2]:"c";h="ui-btn ui-btn-up-"+e.theme;e.inline&&(h+=" ui-btn-inline");if(e.icon)e.icon="ui-icon-"+
e.icon,e.iconpos=e.iconpos||"left",i="ui-icon "+e.icon,e.iconshadow&&(i+=" ui-icon-shadow");e.iconpos&&(h+=" ui-btn-icon-"+e.iconpos,e.iconpos=="notext"&&!d.attr("title")&&d.attr("title",d.text()));e.corners&&(h+=" ui-btn-corner-all",g+=" ui-btn-corner-all");e.shadow&&(h+=" ui-shadow");d.attr("data-"+a.mobile.ns+"theme",e.theme).addClass(h);e=("<D class='"+g+"'><D class='ui-btn-text'></D>"+(e.icon?"<span class='"+i+"'></span>":"")+"</D>").replace(/D/g,e.wrapperEls);d.wrapInner(e)})};a.fn.buttonMarkup.defaults=
{corners:!0,shadow:!0,iconshadow:!0,wrapperEls:"span"};var c=function(){a(document).bind({vmousedown:function(b){var b=d(b.target),c;b&&(b=a(b),c=b.attr("data-"+a.mobile.ns+"theme"),b.removeClass("ui-btn-up-"+c).addClass("ui-btn-down-"+c))},"vmousecancel vmouseup":function(b){var b=d(b.target),c;b&&(b=a(b),c=b.attr("data-"+a.mobile.ns+"theme"),b.removeClass("ui-btn-down-"+c).addClass("ui-btn-up-"+c))},"vmouseover focus":function(b){var b=d(b.target),c;b&&(b=a(b),c=b.attr("data-"+a.mobile.ns+"theme"),
b.removeClass("ui-btn-up-"+c).addClass("ui-btn-hover-"+c))},"vmouseout blur":function(b){var b=d(b.target),c;b&&(b=a(b),c=b.attr("data-"+a.mobile.ns+"theme"),b.removeClass("ui-btn-hover-"+c).addClass("ui-btn-up-"+c))}});c=null};a(document).bind("pagecreate create",function(b){a(":jqmData(role='button'), .ui-bar > a, .ui-header > a, .ui-footer > a, .ui-bar > :jqmData(role='controlgroup') > a",b.target).not(".ui-btn, :jqmData(role='none'), :jqmData(role='nojs')").buttonMarkup()})})(jQuery);
(function(a){a.fn.controlgroup=function(d){return this.each(function(){function c(a){a.removeClass("ui-btn-corner-all ui-shadow").eq(0).addClass(g[0]).end().filter(":last").addClass(g[1]).addClass("ui-controlgroup-last")}var b=a(this),f=a.extend({direction:b.jqmData("type")||"vertical",shadow:!1,excludeInvisible:!0},d),e=b.find(">legend"),g=f.direction=="horizontal"?["ui-corner-left","ui-corner-right"]:["ui-corner-top","ui-corner-bottom"];b.find("input:eq(0)").attr("type");e.length&&(b.wrapInner("<div class='ui-controlgroup-controls'></div>"),
a("<div role='heading' class='ui-controlgroup-label'>"+e.html()+"</div>").insertBefore(b.children(0)),e.remove());b.addClass("ui-corner-all ui-controlgroup ui-controlgroup-"+f.direction);c(b.find(".ui-btn"+(f.excludeInvisible?":visible":"")));c(b.find(".ui-btn-inner"));f.shadow&&b.addClass("ui-shadow")})};a(document).bind("pagecreate create",function(d){a(":jqmData(role='controlgroup')",d.target).controlgroup({excludeInvisible:!1})})})(jQuery);(function(a){a(document).bind("pagecreate create",function(d){a(d.target).find("a").not(".ui-btn, .ui-link-inherit, :jqmData(role='none'), :jqmData(role='nojs')").addClass("ui-link")})})(jQuery);
(function(a,d){a.fn.fixHeaderFooter=function(){if(!a.support.scrollTop)return this;return this.each(function(){var c=a(this);c.jqmData("fullscreen")&&c.addClass("ui-page-fullscreen");c.find(".ui-header:jqmData(position='fixed')").addClass("ui-header-fixed ui-fixed-inline fade");c.find(".ui-footer:jqmData(position='fixed')").addClass("ui-footer-fixed ui-fixed-inline fade")})};a.mobile.fixedToolbars=function(){function c(){!i&&h==="overlay"&&(g||a.mobile.fixedToolbars.hide(!0),a.mobile.fixedToolbars.startShowTimer())}
function b(a){var b=0,c,d;if(a){d=document.body;c=a.offsetParent;for(b=a.offsetTop;a&&a!=d;){b+=a.scrollTop||0;if(a==c)b+=c.offsetTop,c=a.offsetParent;a=a.parentNode}}return b}function f(c){var d=a(window).scrollTop(),e=b(c[0]),f=c.css("top")=="auto"?0:parseFloat(c.css("top")),g=window.innerHeight,h=c.outerHeight(),i=c.parents(".ui-page:not(.ui-page-fullscreen)").length;return c.is(".ui-header-fixed")?(f=d-e+f,f<e&&(f=0),c.css("top",i?f:d)):c.css("top",i?d+g-h-(e-f):d+g-h)}if(a.support.scrollTop){var e,
g,h="inline",i=!1,k=null,l=!1,m=!0;a(function(){var b=a(document),d=a(window);b.bind("vmousedown",function(){m&&(k=h)}).bind("vclick",function(b){m&&!a(b.target).closest("a,input,textarea,select,button,label,.ui-header-fixed,.ui-footer-fixed").length&&!l&&(a.mobile.fixedToolbars.toggle(k),k=null)}).bind("silentscroll",c);(b.scrollTop()===0?d:b).bind("scrollstart",function(){l=!0;k===null&&(k=h);var b=k=="overlay";if(i=b||!!g)a.mobile.fixedToolbars.clearShowTimer(),b&&a.mobile.fixedToolbars.hide(!0)}).bind("scrollstop",
function(b){a(b.target).closest("a,input,textarea,select,button,label,.ui-header-fixed,.ui-footer-fixed").length||(l=!1,i&&(a.mobile.fixedToolbars.startShowTimer(),i=!1),k=null)});d.bind("resize",c)});a(".ui-page").live("pagebeforeshow",function(b,c){var d=a(b.target).find(":jqmData(role='footer')"),g=d.data("id"),h=c.prevPage,h=h&&h.find(":jqmData(role='footer')"),h=h.length&&h.jqmData("id")===g;g&&h&&(e=d,f(e.removeClass("fade in out").appendTo(a.mobile.pageContainer)))}).live("pageshow",function(){var b=
a(this);e&&e.length&&setTimeout(function(){f(e.appendTo(b).addClass("fade"));e=null},500);a.mobile.fixedToolbars.show(!0,this)});a(".ui-collapsible-contain").live("collapse expand",c);return{show:function(c,d){a.mobile.fixedToolbars.clearShowTimer();h="overlay";return(d?a(d):a.mobile.activePage?a.mobile.activePage:a(".ui-page-active")).children(".ui-header-fixed:first, .ui-footer-fixed:not(.ui-footer-duplicate):last").each(function(){var d=a(this),e=a(window).scrollTop(),g=b(d[0]),h=window.innerHeight,
i=d.outerHeight(),e=d.is(".ui-header-fixed")&&e<=g+i||d.is(".ui-footer-fixed")&&g<=e+h;d.addClass("ui-fixed-overlay").removeClass("ui-fixed-inline");!e&&!c&&d.animationComplete(function(){d.removeClass("in")}).addClass("in");f(d)})},hide:function(b){h="inline";return(a.mobile.activePage?a.mobile.activePage:a(".ui-page-active")).children(".ui-header-fixed:first, .ui-footer-fixed:not(.ui-footer-duplicate):last").each(function(){var c=a(this),d=c.css("top"),d=d=="auto"?0:parseFloat(d);c.addClass("ui-fixed-inline").removeClass("ui-fixed-overlay");
if(d<0||c.is(".ui-header-fixed")&&d!==0)b?c.css("top",0):c.css("top")!=="auto"&&parseFloat(c.css("top"))!==0&&c.animationComplete(function(){c.removeClass("out reverse").css("top",0)}).addClass("out reverse")})},startShowTimer:function(){a.mobile.fixedToolbars.clearShowTimer();var b=[].slice.call(arguments);g=setTimeout(function(){g=d;a.mobile.fixedToolbars.show.apply(null,b)},100)},clearShowTimer:function(){g&&clearTimeout(g);g=d},toggle:function(b){b&&(h=b);return h==="overlay"?a.mobile.fixedToolbars.hide():
a.mobile.fixedToolbars.show()},setTouchToggleEnabled:function(a){m=a}}}}();a.fixedToolbars=a.mobile.fixedToolbars;a(document).bind("pagecreate create",function(c){a(":jqmData(position='fixed')",c.target).length&&a(c.target).each(function(){if(!a.support.scrollTop)return this;var b=a(this);b.jqmData("fullscreen")&&b.addClass("ui-page-fullscreen");b.find(".ui-header:jqmData(position='fixed')").addClass("ui-header-fixed ui-fixed-inline fade");b.find(".ui-footer:jqmData(position='fixed')").addClass("ui-footer-fixed ui-fixed-inline fade")})})})(jQuery);
(function(a){function d(){var d=c.width(),g=[],h=[],i;b.removeClass("min-width-"+f.join("px min-width-")+"px max-width-"+f.join("px max-width-")+"px");a.each(f,function(a,b){d>=b&&g.push("min-width-"+b+"px");d<=b&&h.push("max-width-"+b+"px")});g.length&&(i=g.join(" "));h.length&&(i+=" "+h.join(" "));b.addClass(i)}var c=a(window),b=a("html"),f=[320,480,768,1024];a.mobile.addResolutionBreakpoints=function(b){a.type(b)==="array"?f=f.concat(b):f.push(b);f.sort(function(a,b){return a-b});d()};a(document).bind("mobileinit.htmlclass",
function(){c.bind("orientationchange.htmlclass throttledResize.htmlclass",function(a){a.orientation&&b.removeClass("portrait landscape").addClass(a.orientation);d()})});a(function(){c.trigger("orientationchange.htmlclass")})})(jQuery);
(function(a,d){var c=a("html");a("head");var b=a(d);a(d.document).trigger("mobileinit");if(a.mobile.gradeA()){if(a.mobile.ajaxBlacklist)a.mobile.ajaxEnabled=!1;c.addClass("ui-mobile ui-mobile-rendering");var f=a("<div class='ui-loader ui-body-a ui-corner-all'><span class='ui-icon ui-icon-loading spin'></span><h1></h1></div>");a.extend(a.mobile,{showPageLoadingMsg:function(){if(a.mobile.loadingMessage){var b=a("."+a.mobile.activeBtnClass).first();f.find("h1").text(a.mobile.loadingMessage).end().appendTo(a.mobile.pageContainer).css({top:a.support.scrollTop&&
a(d).scrollTop()+a(d).height()/2||b.length&&b.offset().top||100})}c.addClass("ui-loading")},hidePageLoadingMsg:function(){c.removeClass("ui-loading")},pageLoading:function(b){b?a.mobile.hidePageLoadingMsg():a.mobile.showPageLoadingMsg()},initializePage:function(){var c=a(":jqmData(role='page')");c.length||(c=a("body").wrapInner("<div data-"+a.mobile.ns+"role='page'></div>").children(0));c.add(":jqmData(role='dialog')").each(function(){var b=a(this);b.jqmData("url")||b.attr("data-"+a.mobile.ns+"url",
b.attr("id"))});a.mobile.firstPage=c.first();a.mobile.pageContainer=c.first().parent().addClass("ui-mobile-viewport");a.mobile.showPageLoadingMsg();!a.mobile.hashListeningEnabled||!a.mobile.path.stripHash(location.hash)?a.mobile.changePage(a.mobile.firstPage,{transition:"none",reverse:!0,changeHash:!1,fromHashChange:!0}):b.trigger("hashchange",[!0])}});a.mobile._registerInternalEvents();a(function(){d.scrollTo(0,1);a.mobile.defaultHomeScroll=!a.support.scrollTop||a(d).scrollTop()===1?0:1;a.mobile.autoInitializePage&&
a(a.mobile.initializePage);b.load(a.mobile.silentScroll)})}})(jQuery,this);
/*
 * jQuery Mobile Framework : plugin to provide a date and time picker.
 * Copyright (c) JTSage
 * CC 3.0 Attribution.  May be relicensed without permission/notifcation.
 * https://github.com/jtsage/jquery-mobile-datebox
 */
(function($, undefined ) {
  $.widget( "mobile.datebox", $.mobile.widget, {
	options: {
		// All widget options, including some internal runtime details
		theme: 'c',
		pickPageTheme: 'b',
		pickPageInputTheme: 'e',
		pickPageButtonTheme: 'a',
		pickPageHighButtonTheme: 'e',
		pickPageOHighButtonTheme: 'e',
		pickPageODHighButtonTheme: 'e',
		pickPageTodayButtonTheme: 'e',
		pickPageSlideButtonTheme: 'd',
		pickPageFlipButtonTheme: 'b',
		centerWindow: false,
		calHighToday: true,
		calHighPicked: true,
		noAnimation: false,
		disableManualInput: false,
		
		disabled: false,
		wheelExists: false,
		swipeEnabled: true,
		zindex: '500',
		debug: false,
		
		setDateButtonLabel: 'Set Date',
		setTimeButtonLabel: 'Set Time',
		setDurationButtonLabel: 'Set Duration',
		calTodayButtonLabel: 'Jump to Today',
		titleDateDialogLabel: 'Set Date',
		titleTimeDialogLabel: 'Set Time',
		titleDialogLabel: false,
		meridiemLetters: ['AM', 'PM'],
		daysOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
		daysOfWeekShort: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
		monthsOfYear: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
		monthsOfYearShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
		durationLabel: ['Days', 'Hours', 'Minutes', 'Seconds'],
		durationDays: ['Day', 'Days'],
		durationFormat: 'DD ddd, hh:ii:ss',
		timeFormat: 24,
		timeFormats: { '12': 'gg:ii AA', '24': 'HH:ii' },
		timeOutput: false,
		rolloverMode: { 'm': true, 'd': true, 'h': true, 'i': true, 's': true },
		
		mode: 'datebox',
		calShowDays: true,
		calShowOnlyMonth: false,
		useDialogForceTrue: false,
		useDialogForceFalse: false,
		useDialog: false,
		useModal: false,
		useInline: false,
		noButtonFocusMode: false,
		noButton: false,
		noSetButton: false,
		closeCallback: false,
		open: false,
		nestedBox: false,
		
		fieldsOrder: false,
		dateFieldOrder: ['m', 'd', 'y'],
		timeFieldOrder: ['h', 'i', 'a'],
		slideFieldOrder: ['y', 'm', 'd'],
		durationOrder: ['d', 'h', 'i', 's'],
		headerFormat: 'ddd, mmm dd, YYYY',
		dateFormat: 'YYYY-MM-DD',
		minuteStep: 1,
		calTodayButton: false,
		calWeekMode: false,
		calWeekModeFirstDay: 1,
		calWeekModeHighlight: true,
		calStartDay: 0,
		defaultPickerValue: false,
        defaultDate : false,    //this is deprecated and will be removed in the future versions (ok, may be not)
		minYear: false,
		maxYear: false,
		afterToday: false,
		beforeToday: false,
		maxDays: false,
		minDays: false,
		highDays: false,
		highDates: false,
		blackDays: false,
		blackDates: false,
		durationSteppers: {'d': 1, 'h': 1, 'i': 1, 's': 1},
		disabledDayColor: '#888'
	},
	_dateboxHandler: function(event, payload) {
		// Handle all event triggers that have an internal effect
		if ( ! event.isPropagationStopped() ) {
			switch (payload.method) {
				case 'close':
					$(this).data('datebox').close();
					break;
				case 'open':
					$(this).data('datebox').open();
					break;
				case 'set':
					$(this).val(payload.value);
					$(this).trigger('change');
					break;
				case 'doset':
					if ( $(this).data('datebox').options.mode === 'timebox' || $(this).data('datebox').options.mode === 'durationbox' ) {
						$(this).trigger('datebox', {'method':'set', 'value':$(this).data('datebox')._formatTime($(this).data('datebox').theDate)});
					} else {
						$(this).trigger('datebox', {'method':'set', 'value':$(this).data('datebox')._formatDate($(this).data('datebox').theDate)});
					}
				case 'dooffset':
					$(this).data('datebox')._offset(payload.type, payload.amount, true);
					break;
				case 'dorefresh':
					$(this).data('datebox')._update();
					break;
			}
		} 
	},
	_zeroPad: function(number) {
		// Pad a number with a zero, to make it 2 digits
		return ( ( number < 10 ) ? "0" : "" ) + String(number);
	},
	_makeOrd: function (num) {
		// Return an ordinal suffix (1st, 2nd, 3rd, etc)
		var ending = num % 10;
		if ( num > 9 && num < 21 ) { return 'th'; }
		if ( ending > 3 ) { return 'th'; }
		return ['th','st','nd','rd'][ending];
	},
	_isInt: function (s) {
		// Bool, return is a number is an integer
		return (s.toString().search(/^[0-9]+$/) === 0);
	},
	_dstAdjust: function(date) {
		// Make sure not to run into daylight savings time.
		if (!date) { return null; }
		date.setHours(date.getHours() > 12 ? date.getHours() + 2 : 0);
		return date;
	},
	_getFirstDay: function(date) {
		// Get the first DAY of the month (0-6)
		return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
	},
	_getLastDate: function(date) {
		// Get the last DATE of the month (28,29,30,31)
		return 32 - this._dstAdjust(new Date(date.getFullYear(), date.getMonth(), 32)).getDate();
	},
	_getLastDateBefore: function(date) {
		// Get the last DATE of the PREVIOUS month (28,29,30,31)
		return 32 - this._dstAdjust(new Date(date.getFullYear(), date.getMonth()-1, 32)).getDate();
	},
	_formatter: function(format, date) {
		// Format the output date or time (not duration)
		format = format.replace('SS', this._makeOrd(date.getDate()));
		format = format.replace('YYYY', date.getFullYear());
		format = format.replace('mmmm', this.options.monthsOfYearShort[date.getMonth()] );
		format = format.replace('mmm',  this.options.monthsOfYear[date.getMonth()] );
		format = format.replace('MM',   this._zeroPad(date.getMonth() + 1));
		format = format.replace('mm',   date.getMonth() + 1);
		format = format.replace('dddd', this.options.daysOfWeekShort[date.getDay()] );
		format = format.replace('ddd',  this.options.daysOfWeek[date.getDay()] );
		format = format.replace('DD',   this._zeroPad(date.getDate()));
		format = format.replace('dd',   date.getDate());
		
		format = format.replace('HH',   this._zeroPad(date.getHours()));
		format = format.replace('GG',   date.getHours());
		
		format = format.replace('hh',   this._zeroPad(((date.getHours() === 0 || date.getHours() === 12)?12:((date.getHours()<12)?date.getHours():date.getHours()-12))));
		format = format.replace('gg',   ((date.getHours() === 0 || date.getHours() === 12)?12:((date.getHours()<12)?date.getHours():(date.getHours()-12))));
		
		format = format.replace('ii',   this._zeroPad(date.getMinutes()));
		format = format.replace('ss',   this._zeroPad(date.getSeconds()));
		format = format.replace('AA',   ((date.getHours() < 12)?this.options.meridiemLetters[0].toUpperCase():this.options.meridiemLetters[1].toUpperCase()));
		format = format.replace('aa',   ((date.getHours() < 12)?this.options.meridiemLetters[0].toLowerCase():this.options.meridiemLetters[1].toLowerCase()));
		return format;
	},
	_formatHeader: function(date) {
		// Shortcut function to return headerFormat date/time format
		return this._formatter(this.options.headerFormat, date);
	},
	_formatDate: function(date) {
		// Shortcut function to return dateFormat date/time format
		return this._formatter(this.options.dateFormat, date);
	},
	_isoDate: function(y,m,d) {
		// Return an ISO 8601 date (yyyy-mm-dd)
		return String(y) + '-' + (( m < 10 ) ? "0" : "") + String(m) + '-' + ((d < 10 ) ? "0" : "") + String(d);
	},
	_formatTime: function(date) {
		// Shortcut to return formatted time, also handles duration
		var self = this,
			dur_collapse = [false,false,false], adv, exp_format, i, j,
			format = this.options.durationFormat,
			dur_comps = [0,0,0,0];
			
		if ( this.options.mode === 'durationbox' ) {
			adv = this.options.durationFormat;
			adv = adv.replace(/ddd/g, '.+?');
			adv = adv.replace(/DD|ss|hh|ii/g, '([0-9Dhis]+)');
			adv = RegExp('^' + adv + '$');
			exp_format = adv.exec(this.options.durationFormat);
			
			i = ((self.theDate.getTime() - self.theDate.getMilliseconds()) / 1000) - ((self.initDate.getTime() - self.initDate.getMilliseconds()) / 1000); j = i;
			
			dur_comps[0] = parseInt( i / (60*60*24),10); i = i - (dur_comps[0]*60*60*24); // Days
			dur_comps[1] = parseInt( i / (60*60),10); i = i - (dur_comps[1]*60*60); // Hours
			dur_comps[2] = parseInt( i / (60),10); i = i - (dur_comps[2]*60); // Minutes
			dur_comps[3] = i; // Seconds
			
			if ( ! exp_format[0].match(/DD/) ) { dur_collapse[0] = true; dur_comps[1] = dur_comps[1] + (dur_comps[0]*24);}
			if ( ! exp_format[0].match(/hh/) ) { dur_collapse[1] = true; dur_comps[2] = dur_comps[2] + (dur_comps[1]*60);}
			if ( ! exp_format[0].match(/ii/) ) { dur_collapse[2] = true; dur_comps[3] = dur_comps[3] + (dur_comps[2]*60);}
			
			if ( this.options.debug ) { 
				console.log({'format': exp_format, 'collapse': dur_collapse, 'seconds': j, 'parts': dur_comps});
			}
			
			format = format.replace('DD', dur_comps[0]);
			format = format.replace('ddd', ((dur_comps[0] > 1)?this.options.durationDays[1]:this.options.durationDays[0]));
			format = format.replace('hh', self._zeroPad(dur_comps[1]));
			format = format.replace('ii', self._zeroPad(dur_comps[2]));
			format = format.replace('ss', self._zeroPad(dur_comps[3]));
			return format;
		} else {
			return this._formatter(self.options.timeOutput, date);
		}
	},
	_makeDate: function (str) {
		// Date Parser
		str = $.trim(str);
		var o = this.options,
			self = this,
			adv = null,
			exp_input = null,
			exp_format = null,
			exp_temp = null,
			date = new Date(),
			dur_collapse = [false,false,false],
			found_date = [date.getFullYear(),date.getMonth(),date.getDate(),date.getHours(),date.getMinutes(),date.getSeconds()],
			i;

		if ( o.mode === 'durationbox' ) {
			adv = o.durationFormat;
			adv = adv.replace(/ddd/g, '.+?');
			adv = adv.replace(/DD|ss|hh|ii/g, '([0-9Dhis]+)');
			adv = RegExp('^' + adv + '$');
			exp_input = adv.exec(str);
			exp_format = adv.exec(o.durationFormat);
			
			if ( o.debug ) { // Legacy debug code - you probably never need this.
				console.log({'info': 'EXPERIMENTAL REGEX MODE ENABLED', 'string': str, 'regex':adv, 'input':exp_input, 'format':exp_format});
			}
			
			if ( exp_input === null || exp_input.length !== exp_format.length ) {
				if ( typeof o.defaultPickerValue === "number" && o.defaultPickerValue > 0 ) {
					return new Date(self.initDate.getTime() + (parseInt(o.defaultPickerValue,10) * 1000));
				} else {
					return new Date(self.initDate.getTime());
				}
			} else {
				exp_temp = ((self.initDate.getTime() - self.initDate.getMilliseconds()) / 1000);
				for ( i=0; i<exp_input.length; i++ ) { //0y 1m 2d 3h 4i 5s
					if ( exp_format[i].match(/^DD$/i) )   { exp_temp = exp_temp + (parseInt(exp_input[i],10)*60*60*24); }
					if ( exp_format[i].match(/^hh$/i) )   { exp_temp = exp_temp + (parseInt(exp_input[i],10)*60*60); }
					if ( exp_format[i].match(/^ii$/i) )   { exp_temp = exp_temp + (parseInt(exp_input[i],10)*60); }
					if ( exp_format[i].match(/^ss$/i) )   { exp_temp = exp_temp + (parseInt(exp_input[i],10)); }
				}
				return new Date((exp_temp*1000));
			}
		} else {
			if ( o.mode === 'timebox' || o.mode === 'timeflipbox' ) { adv = o.timeOutput; } else { adv = o.dateFormat; }
			
			adv = adv.replace(/dddd|mmmm/g, '(.+?)');
			adv = adv.replace(/ddd|SS/g, '.+?');
			adv = adv.replace(/mmm/g, '(.+?)');
			adv = adv.replace(/ *AA/ig, ' *(.*?)');
			adv = adv.replace(/yyyy|dd|mm|gg|hh|ii/ig, '([0-9yYdDmMgGhHi]+)');
			adv = adv.replace(/ss/g, '([0-9s]+)');
			adv = RegExp('^' + adv + '$');
			exp_input = adv.exec(str);
			if ( o.mode === 'timebox' || o.mode === 'timeflipbox' ) {
				exp_format = adv.exec(o.timeOutput); // If time, use timeOutput as expected format
			} else {
				exp_format = adv.exec(o.dateFormat); // If date, use dateFormat as expected format
			}
			
			if ( o.debug ) { // Legacy debug code - you probably never need this.
				console.log({'info': 'EXPERIMENTAL REGEX MODE ENABLED', 'string': str, 'regex':adv, 'input':exp_input, 'format':exp_format});
			}
			
			if ( exp_input === null || exp_input.length !== exp_format.length ) {
				if ( o.defaultPickerValue !== false ) {
					if ( $.isArray(o.defaultPickerValue) && o.defaultPickerValue.length === 3 ) {
						if ( o.mode === 'timebox' || o.mode === 'timeflipbox' ) {
							return new Date(found_date[0], found_date[1], found_date[2], o.defaultPickerValue[0], o.defaultPickerValue[1], o.defaultPickerValue[2], 0);
						}
						else {
							return new Date(o.defaultPickerValue[0], o.defaultPickerValue[1], o.defaultPickerValue[2], 0, 0, 0, 0);
						}
					}
					else {
						if ( o.mode === 'timebox' || o.mode === 'timeflipbox' ) {
							exp_temp = o.defaultPickerValue.split(':');
							if ( exp_temp.length === 3 ) {
								date = new Date(found_date[0], found_date[1], found_date[2], parseInt(exp_temp[0],10),parseInt(exp_temp[1],10),parseInt(exp_temp[2],10),0);
								if ( isNaN(date.getDate()) ) { date = new Date(); }
							}
						}
						else {
							exp_temp = o.defaultPickerValue.split('-');
							if ( exp_temp.length === 3 ) {
								date = new Date(parseInt(exp_temp[0],10),parseInt(exp_temp[1],10)-1,parseInt(exp_temp[2],10),0,0,0,0);
								if ( isNaN(date.getDate()) ) { date = new Date(); }
							}
						}
					}
				}
			} else {
				for ( i=0; i<exp_input.length; i++ ) { //0y 1m 2d 3h 4i 5s
					if ( exp_format[i].match(/^gg$/i) )   { found_date[3] = parseInt(exp_input[i],10); }
					if ( exp_format[i].match(/^hh$/i) )   { found_date[3] = parseInt(exp_input[i],10); }
					if ( exp_format[i].match(/^ii$/i) )   { found_date[4] = parseInt(exp_input[i],10); }
					if ( exp_format[i].match(/^ss$/ ) )   { found_date[5] = parseInt(exp_input[i],10); }
					if ( exp_format[i].match(/^dd$/i) )   { found_date[2] = parseInt(exp_input[i],10); }
					if ( exp_format[i].match(/^mm$/i) )   { found_date[1] = parseInt(exp_input[i],10)-1; }
					if ( exp_format[i].match(/^yyyy$/i) ) { found_date[0] = parseInt(exp_input[i],10); }
					if ( exp_format[i].match(/^AA$/i) )   { 
						if ( exp_input[i].toLowerCase().charAt(0) === 'a' && found_date[3] === 12 ) {
							found_date[3] = 0;
						} else if ( exp_input[i].toLowerCase().charAt(0) === 'p' && found_date[3] !== 12 ) {
							found_date[3] = found_date[3] + 12;
						}
					}
					if ( exp_format[i].match(/^mmm$/i) )  { 
						exp_temp = $.inArray(exp_input[i], o.monthsOfYear);
						if ( exp_temp > -1 ) { found_date[1] = exp_temp; }
					}
					if ( exp_format[i].match(/^mmmm$/i) )  { 
						exp_temp = $.inArray(exp_input[i], o.monthsOfYearShort);
						if ( exp_temp > -1 ) { found_date[1] = exp_temp; }
					}
				}
			}
			if ( exp_format[0].match(/G|g|i|s|H|h|A/) ) { 
				return new Date(found_date[0], found_date[1], found_date[2], found_date[3], found_date[4], found_date[5], 0);
			} else {
				return new Date(found_date[0], found_date[1], found_date[2], 0, 0, 0, 0); // Normalize time for raw dates
			}
		}
	},
	_checker: function(date) {
		// Return a ISO 8601 BASIC format date (YYYYMMDD) for simple comparisons
		return parseInt(String(date.getFullYear()) + this._zeroPad(date.getMonth()+1) + this._zeroPad(date.getDate()),10);
	},
	_hoover: function(item) {
		// Hover toggle class, for calendar
		$(item).toggleClass('ui-btn-up-'+$(item).attr('data-theme')+' ui-btn-down-'+$(item).attr('data-theme'));
	},
	_offset: function(mode, amount, update) {
		// Compute a date/time offset.
		//   update = false to prevent controls refresh
		var self = this,
			o = this.options;
			
		if ( typeof(update) === "undefined" ) { update = true; }
		self.input.trigger('datebox', {'method':'offset', 'type':mode, 'amount':amount});
		switch(mode) {
			case 'y':
				self.theDate.setYear(self.theDate.getFullYear() + amount);
				break;
			case 'm':
			console.log(o.rolloverMode);
				if ( o.rolloverMode['m'] || ( self.theDate.getMonth() + amount < 12 && self.theDate.getMonth() + amount > -1 ) ) {
					self.theDate.setMonth(self.theDate.getMonth() + amount);
				}
				break;
			case 'd':
				if ( o.rolloverMode['d'] || (
					self.theDate.getDate() + amount > 0 &&
					self.theDate.getDate() + amount < (self._getLastDate(self.theDate) + 1) ) ) {
						self.theDate.setDate(self.theDate.getDate() + amount);
				}
				break;
			case 'h':
				if ( o.rolloverMode['h'] || (
					self.theDate.getHours() + amount > -1 &&
					self.theDate.getHours() + amount < 24 ) ) {
						self.theDate.setHours(self.theDate.getHours() + amount);
				}
				break;
			case 'i':
				if ( o.rolloverMode['i'] || (
					self.theDate.getMinutes() + amount > -1 &&
					self.theDate.getMinutes() + amount < 60 ) ) {
						self.theDate.setMinutes(self.theDate.getMinutes() + amount);
				}
				break;
			case 's':
				if ( o.rolloverMode['i'] || (
					self.theDate.getSeconds() + amount > -1 &&
					self.theDate.getSeconds() + amount < 60 ) ) {
						self.theDate.setSeconds(self.theDate.getSeconds() + amount);
				}
				break;
			case 'a':
				if ( self.pickerMeri.val() === o.meridiemLetters[0] ) { 
					self._offset('h',12,false);
				} else {
					self._offset('h',-12,false);
				}
				break;
		}
		if ( update === true ) { self._update(); }
	},
	_updateduration: function() {
		// Update the duration contols when inputs are directly edited.
		var self = this,
			secs = (self.initDate.getTime() - self.initDate.getMilliseconds()) / 1000;
		
		if ( !self._isInt(self.pickerDay.val())  ) { self.pickerDay.val(0); }
		if ( !self._isInt(self.pickerHour.val()) ) { self.pickerHour.val(0); }
		if ( !self._isInt(self.pickerMins.val()) ) { self.pickerMins.val(0); }
		if ( !self._isInt(self.pickerSecs.val()) ) { self.pickerSecs.val(0); }
		
		secs = secs + (parseInt(self.pickerDay.val(),10) * 60 * 60 * 24);
		secs = secs + (parseInt(self.pickerHour.val(),10) * 60 * 60);
		secs = secs + (parseInt(self.pickerMins.val(),10) * 60);
		secs = secs + (parseInt(self.pickerSecs.val(),10));
		self.theDate.setTime( secs * 1000 );
		self._update();
	},
	_update: function() {
		// Update the display on date change
		var self = this,
			o = self.options, 
			testDate = null,
			i, gridWeek, gridDay, skipThis, thisRow, y, cTheme, inheritDate, thisPRow, tmpVal,
			interval = {'d': 60*60*24, 'h': 60*60, 'i': 60, 's':1},
			calmode = {};
			
		self.input.trigger('datebox', {'method':'refresh'});
		/* BEGIN:DURATIONBOX */
		if ( o.mode === 'durationbox' ) {
			i = ((self.theDate.getTime() - self.theDate.getMilliseconds()) / 1000) - ((self.initDate.getTime() - self.initDate.getMilliseconds()) / 1000);
			if ( i<0 ) { i = 0; self.theDate.setTime(self.initDate.getTime()); }
			
			/* DAYS */
			y = parseInt( i / interval['d'],10); 
			i = i - ( y * interval['d'] ); 
			self.pickerDay.val(y);
			
			/* HOURS */
			y = parseInt( i / interval['h'], 10);
			i = i - ( y * interval['h'] );
			self.pickerHour.val(y);
			
			/* MINS AND SECS */
			y = parseInt( i / interval['i'], 10);
			i = i - ( y * interval['i']); 
			self.pickerMins.val(y);
			self.pickerSecs.val(parseInt(i,10));
		}
		/* END:DURATIONBOX */
		/* BEGIN:TIMEBOX */
		if ( o.mode === 'timebox' ) {
			if ( o.minuteStep !== 1 ) {
				i = self.theDate.getMinutes() % o.minuteStep;
				if ( i !== 0 ) { self.theDate.setMinutes(self.theDate.getMinutes() - i); }
			}
			self.pickerMins.val(self._zeroPad(self.theDate.getMinutes()));
			if ( o.timeFormat === 12 ) { // Handle meridiems
				if ( self.theDate.getHours() > 11 ) {
					self.pickerMeri.val(o.meridiemLetters[1]);
					if ( self.theDate.getHours() === 12 ) {
						self.pickerHour.val(12);
					} else {
						self.pickerHour.val(self.theDate.getHours() - 12);
					}
				} else {
					self.pickerMeri.val(o.meridiemLetters[0]);
					if ( self.theDate.getHours() === 0 ) {
						self.pickerHour.val(12);
					} else {
						self.pickerHour.val(self.theDate.getHours());
					}
				}
			} else {
				self.pickerHour.val(self.theDate.getHours());
			}
		}
		/* END:TIMEBOX */
		/* BEGIN:FLIPBOX */
		if ( o.mode === 'flipbox' || o.mode === 'timeflipbox' ) {
			if ( o.afterToday !== false ) {
				testDate = new Date();
				if ( self.theDate < testDate ) { self.theDate = testDate; }
			}
			if ( o.maxDays !== false ) {
				testDate = new Date();
				testDate.setDate(testDate.getDate() + o.maxDays);
				if ( self.theDate > testDate ) { self.theDate = testDate; }
			}
			if ( o.minDays !== false ) {
				testDate = new Date();
				testDate.setDate(testDate.getDate() - o.minDays);
				if ( self.theDate < testDate ) { self.theDate = testDate; }
			}
			if ( o.maxYear !== false ) {
				testDate = new Date(o.maxYear, 0, 1);
				testDate.setDate(testDate.getDate() - 1);
				if ( self.theDate > testDate ) { self.theDate = testDate; }
			}
			if ( o.minYear !== false ) {
				testDate = new Date(o.minYear, 0, 1);
				if ( self.theDate < testDate ) { self.theDate = testDate; }
			}
			
			inheritDate = self._makeDate(self.input.val());
			
			self.controlsHeader.html( self._formatHeader(self.theDate) );
			
			for ( y=0; y<o.fieldsOrder.length; y++ ) {
				tmpVal = true;
				switch (o.fieldsOrder[y]) {
					case 'y':
						thisRow = self.pickerYar.find('ul');
						thisRow.html('');
						for ( i=-15; i<16; i++ ) {
							cTheme = ((inheritDate.getFullYear()===(self.theDate.getFullYear() + i))?o.pickPageHighButtonTheme:o.pickPageFlipButtonTheme);
							if ( i === 0 ) { cTheme = o.pickPageButtonTheme; }
							$("<li>", { 'class' : 'ui-body-'+cTheme, 'style':''+((tmpVal===true)?'margin-top: -453px':'') })
								.html("<span>"+(self.theDate.getFullYear() + i)+"</span>")
								.attr('data-offset', i)
								.attr('data-theme', cTheme)
								.appendTo(thisRow);
							if ( tmpVal === true ) { tmpVal = false; }
						}
						break;
					case 'm':
						thisRow = self.pickerMon.find('ul');
						thisRow.html('');
						for ( i=-12; i<13; i++ ) {
							testDate = new Date(self.theDate.getFullYear(), self.theDate.getMonth(), 1);
							testDate.setMonth(testDate.getMonth()+i);
							cTheme = ( inheritDate.getMonth() === testDate.getMonth() && inheritDate.getYear() === testDate.getYear() ) ? o.pickPageHighButtonTheme : o.pickPageFlipButtonTheme;
							if ( i === 0 ) { cTheme = o.pickPageButtonTheme; }
							$("<li>", { 'class' : 'ui-body-'+cTheme, 'style':''+((tmpVal===true)?'margin-top: -357px':'') })
								.attr('data-offset',i)
								.attr('data-theme', cTheme)
								.html("<span>"+o.monthsOfYearShort[testDate.getMonth()]+"</span>")
								.appendTo(thisRow);
							if ( tmpVal === true ) { tmpVal = false; }
						}
						break;
					case 'd':
						thisRow = self.pickerDay.find('ul');
						thisRow.html('');
						for ( i=-15; i<16; i++ ) {
							testDate = new Date(self.theDate.getFullYear(), self.theDate.getMonth(), self.theDate.getDate());
							testDate.setDate(testDate.getDate()+i);
							cTheme = ( inheritDate.getDate() === testDate.getDate() && inheritDate.getMonth() === testDate.getMonth() && inheritDate.getYear() === testDate.getYear() ) ? o.pickPageHighButtonTheme : o.pickPageFlipButtonTheme;
							if ( i === 0 ) { cTheme = o.pickPageButtonTheme; }
							$("<li>", { 'class' : 'ui-body-'+cTheme, 'style':''+((tmpVal===true)?'margin-top: -453px':'') })
								.attr('data-offset', i)
								.attr('data-theme', cTheme)
								.html("<span>"+testDate.getDate()+"</span>")
								.appendTo(thisRow);
							if ( tmpVal === true ) { tmpVal = false; }
						}
						break;
					case 'h':
						thisRow = self.pickerHour.find('ul');
						thisRow.html('');
						for ( i=-12; i<13; i++ ) {
							testDate = new Date(self.theDate.getFullYear(), self.theDate.getMonth(), self.theDate.getDate(), self.theDate.getHours());
							testDate.setHours(testDate.getHours()+i);
							cTheme = ( i === 0 ) ?  o.pickPageButtonTheme : o.pickPageFlipButtonTheme;
							$("<li>", { 'class' : 'ui-body-'+cTheme, 'style':''+((tmpVal===true)?'margin-top: -357px':'') })
								.attr('data-offset',i)
								.attr('data-theme', cTheme)
								.html("<span>"+( ( o.timeFormat === 12 ) ? ( ( testDate.getHours() === 0 ) ? '12' : ( ( testDate.getHours() < 12 ) ? testDate.getHours() : ( ( testDate.getHours() === 12 ) ? '12' : (testDate.getHours()-12) ) ) ) : testDate.getHours() )+"</span>")
								.appendTo(thisRow);
							if ( tmpVal === true ) { tmpVal = false; }
						}
						break;
					case 'i':
						thisRow = self.pickerMins.find('ul');
						thisRow.html('');
						for ( i=-30; i<31; i++ ) {
							if ( o.minuteStep > 1 ) { self.theDate.setMinutes(self.theDate.getMinutes() - (self.theDate.getMinutes() % o.minuteStep)); }
							testDate = new Date(self.theDate.getFullYear(), self.theDate.getMonth(), self.theDate.getDate(), self.theDate.getHours(), self.theDate.getMinutes());
							testDate.setMinutes(testDate.getMinutes()+(i*o.minuteStep));
							cTheme = ( i === 0 ) ?  o.pickPageButtonTheme : o.pickPageFlipButtonTheme;
							$("<li>", { 'class' : 'ui-body-'+cTheme, 'style':''+((tmpVal===true)?'margin-top: -933px':'') })
								.attr('data-offset',(i*o.minuteStep))
								.attr('data-theme', cTheme)
								.html("<span>"+self._zeroPad(testDate.getMinutes())+"</span>")
								.appendTo(thisRow);
							if ( tmpVal === true ) { tmpVal = false; }
						}
						break;
					case 'a':
						thisRow = self.pickerMeri.find('ul');
						thisRow.html('');
						if ( self.theDate.getHours() > 11 ) { 
							tmpVal = '-65';
							cTheme = [o.pickPageFlipButtonTheme, o.pickPageButtonTheme]
						} else {
							tmpVal = '-33';
							cTheme = [o.pickPageButtonTheme, o.pickPageFlipButtonTheme]
						}
						$("<li>").appendTo(thisRow).clone().appendTo(thisRow);
						$("<li>", { 'class' : 'ui-body-'+cTheme[0], 'style':'margin-top: '+tmpVal+'px' })
							.attr('data-offset',1)
							.attr('data-theme', cTheme[0])
							.html("<span>"+o.meridiemLetters[0]+"</span>")
							.appendTo(thisRow);
						$("<li>", { 'class' : 'ui-body-'+cTheme[1] })
							.attr('data-offset',1)
							.attr('data-theme', cTheme[1])
							.html("<span>"+o.meridiemLetters[1]+"</span>")
							.appendTo(thisRow);
						$("<li>").appendTo(thisRow).clone().appendTo(thisRow);
						break;
				}
			}
		}
		/* END:FLIPBOX */
		/* BEGIN:SLIDEBOX */
		if ( o.mode === 'slidebox' ) {
			if ( o.afterToday !== false ) {
				testDate = new Date();
				if ( self.theDate < testDate ) { self.theDate = testDate; }
			}
			if ( o.maxDays !== false ) {
				testDate = new Date();
				testDate.setDate(testDate.getDate() + o.maxDays);
				if ( self.theDate > testDate ) { self.theDate = testDate; }
			}
			if ( o.minDays !== false ) {
				testDate = new Date();
				testDate.setDate(testDate.getDate() - o.minDays);
				if ( self.theDate < testDate ) { self.theDate = testDate; }
			}
			if ( o.maxYear !== false ) {
				testDate = new Date(o.maxYear, 0, 1);
				testDate.setDate(testDate.getDate() - 1);
				if ( self.theDate > testDate ) { self.theDate = testDate; }
			}
			if ( o.minYear !== false ) {
				testDate = new Date(o.minYear, 0, 1);
				if ( self.theDate < testDate ) { self.theDate = testDate; }
			}
			
			inheritDate = self._makeDate(self.input.val());
			
			self.controlsHeader.html( self._formatHeader(self.theDate) );
			self.controlsInput.html('');
			
			for ( y=0; y<o.fieldsOrder.length; y++ ) {
				thisPRow = $("<div>", {'data-rowtype': o.fieldsOrder[y]});
				
				if ( o.wheelExists ) {
					thisPRow.bind('mousewheel', function(e,d) {
						e.preventDefault();
						self._offset($(this).attr('data-rowtype'), ((d>0)?1:-1));
					});
				}
				
				thisRow = $("<div>", {'class': 'ui-datebox-sliderow-int', 'data-rowtype': o.fieldsOrder[y]}).appendTo(thisPRow);
				
				if ( o.swipeEnabled ) {
					thisRow
						.bind(self.START_DRAG, function(e) {
							if ( !self.dragMove ) {
								self.dragMove = true;
								self.dragTarget = $(this);
								self.dragPos = parseInt(self.dragTarget.css('marginLeft').replace(/px/i, ''),10);
								self.dragStart = self.touch ? e.originalEvent.changedTouches[0].pageX : e.pageX;
								self.dragEnd = false;
								e.stopPropagation();
								e.preventDefault();
							}
						});
				}
				switch (o.fieldsOrder[y]) {
					case 'y':
						thisPRow.addClass('ui-datebox-sliderow-ym');
						thisRow.css('marginLeft', '-333px');
						for ( i=-5; i<6; i++ ) {
							cTheme = ((inheritDate.getFullYear()===(self.theDate.getFullYear() + i))?o.pickPageHighButtonTheme:o.pickPageSlideButtonTheme);
							if ( i === 0 ) { cTheme = o.pickPageButtonTheme; }
							$("<div>", { 'class' : 'ui-datebox-slideyear ui-corner-all ui-btn-up-'+cTheme })
								.text(self.theDate.getFullYear() + i)
								.attr('data-offset', i)
								.attr('data-theme', cTheme)
								.bind('vmouseover vmouseout', function() { self._hoover(this); })
								.bind('vclick', function(e) { e.preventDefault(); self._offset('y', parseInt($(this).attr('data-offset'),10)); })
								.appendTo(thisRow);
						}
						break;
					case 'm':
						thisPRow.addClass('ui-datebox-sliderow-ym');
						thisRow.css('marginLeft', '-204px');
						for ( i=-6; i<7; i++ ) {
							testDate = new Date(self.theDate.getFullYear(), self.theDate.getMonth(), 1);
							testDate.setMonth(testDate.getMonth()+i);
							cTheme = ( inheritDate.getMonth() === testDate.getMonth() && inheritDate.getYear() === testDate.getYear() ) ? o.pickPageHighButtonTheme : o.pickPageSlideButtonTheme;
							if ( i === 0 ) { cTheme = o.pickPageButtonTheme; }
							$("<div>", { 'class' : 'ui-datebox-slidemonth ui-corner-all ui-btn-up-'+cTheme })
								.attr('data-offset',i)
								.attr('data-theme', cTheme)
								.text(o.monthsOfYearShort[testDate.getMonth()])
								.bind('vmouseover vmouseout', function() { self._hoover(this); })
								.bind('vclick', function(e) { e.preventDefault(); self._offset('m', parseInt($(this).attr('data-offset'),10)); })
								.appendTo(thisRow);
						}
						break;
					case 'd':
						thisPRow.addClass('ui-datebox-sliderow-d');
						thisRow.css('marginLeft', '-386px');
						for ( i=-15; i<16; i++ ) {
							testDate = new Date(self.theDate.getFullYear(), self.theDate.getMonth(), self.theDate.getDate());
							testDate.setDate(testDate.getDate()+i);
							cTheme = ( inheritDate.getDate() === testDate.getDate() && inheritDate.getMonth() === testDate.getMonth() && inheritDate.getYear() === testDate.getYear() ) ? o.pickPageHighButtonTheme : o.pickPageSlideButtonTheme;
							if ( i === 0 ) { cTheme = o.pickPageButtonTheme; }
							
							$("<div>", { 'class' : 'ui-datebox-slideday ui-corner-all ui-btn-up-'+cTheme })
								.attr('data-offset', i)
								.attr('data-theme', cTheme)
								.html(testDate.getDate() + '<br /><span class="ui-datebox-slidewday">' + o.daysOfWeekShort[testDate.getDay()] + '</span>')
								.bind('vmouseover vmouseout', function() { self._hoover(this); })
								.bind('vclick', function(e) { e.preventDefault(); self._offset('d', parseInt($(this).attr('data-offset'),10)); })
								.appendTo(thisRow);
						}
						break;
					case 'h':
						thisPRow.addClass('ui-datebox-sliderow-hi');
						thisRow.css('marginLeft', '-284px');
						for ( i=-12; i<13; i++ ) {
							testDate = new Date(self.theDate.getFullYear(), self.theDate.getMonth(), self.theDate.getDate(), self.theDate.getHours());
							testDate.setHours(testDate.getHours()+i);
							cTheme = ( i === 0 ) ?  o.pickPageButtonTheme : o.pickPageSlideButtonTheme;
							$("<div>", { 'class' : 'ui-datebox-slidehour ui-corner-all ui-btn-up-'+cTheme })
								.attr('data-offset',i)
								.attr('data-theme', cTheme)
								.html(( ( o.timeFormat === 12 ) ? ( ( testDate.getHours() === 0 ) ? '12<span class="ui-datebox-slidewday">AM</span>' : ( ( testDate.getHours() < 12 ) ? testDate.getHours() + '<span class="ui-datebox-slidewday">AM</span>' : ( ( testDate.getHours() === 12 ) ? '12<span class="ui-datebox-slidewday">PM</span>' : (testDate.getHours()-12) + '<span class="ui-datebox-slidewday">PM</span>') ) ) : testDate.getHours() ))
								.bind('vmouseover vmouseout', function() { self._hoover(this); })
								.bind('vclick', function(e) { e.preventDefault(); self._offset('h', parseInt($(this).attr('data-offset'),10)); })
								.appendTo(thisRow);
						}
						break;
					case 'i':
						thisPRow.addClass('ui-datebox-sliderow-hi');
						thisRow.css('marginLeft', '-896px');
						for ( i=-30; i<31; i++ ) {
							testDate = new Date(self.theDate.getFullYear(), self.theDate.getMonth(), self.theDate.getDate(), self.theDate.getHours(), self.theDate.getMinutes());
							testDate.setMinutes(testDate.getMinutes()+i);
							cTheme = ( i === 0 ) ?  o.pickPageButtonTheme : o.pickPageSlideButtonTheme;
							$("<div>", { 'class' : 'ui-datebox-slidemins ui-corner-all ui-btn-up-'+cTheme })
								.attr('data-offset',i)
								.attr('data-theme', cTheme)
								.text(self._zeroPad(testDate.getMinutes()))
								.bind('vmouseover vmouseout', function() { self._hoover(this); })
								.bind('vclick', function(e) { e.preventDefault(); self._offset('i', parseInt($(this).attr('data-offset'),10)); })
								.appendTo(thisRow);
						}
						break;
				}
				thisPRow.appendTo(self.controlsInput);
			}
		}
		/* END:SLIDEBOX */
		/* BEGIN:DATEBOX */
		if ( o.mode === 'datebox' ) {
			if ( o.afterToday !== false ) {
				testDate = new Date();
				if ( self.theDate < testDate ) { self.theDate = testDate; }
			}
			if ( o.beforeToday !== false ) {
				testDate = new Date();
				if ( self.theDate > testDate ) { self.theDate = testDate; }
			}
			if ( o.maxDays !== false ) {
				testDate = new Date();
				testDate.setDate(testDate.getDate() + o.maxDays);
				if ( self.theDate > testDate ) { self.theDate = testDate; }
			}
			if ( o.minDays !== false ) {
				testDate = new Date();
				testDate.setDate(testDate.getDate() - o.minDays);
				if ( self.theDate < testDate ) { self.theDate = testDate; }
			}
			if ( o.maxYear !== false ) {
				testDate = new Date(o.maxYear, 0, 1);
				testDate.setDate(testDate.getDate() - 1);
				if ( self.theDate > testDate ) { self.theDate = testDate; }
			}
			if ( o.minYear !== false ) {
				testDate = new Date(o.minYear, 0, 1);
				if ( self.theDate < testDate ) { self.theDate = testDate; }
			}
			
			self.controlsHeader.html( self._formatHeader(self.theDate) );
			self.pickerMon.val(self.theDate.getMonth() + 1);
			self.pickerDay.val(self.theDate.getDate());
			self.pickerYar.val(self.theDate.getFullYear());
		}
		/* END:DATEBOX */
		/* BEGIN:CALBOX */
		if ( o.mode === 'calbox' ) { // Meat and potatos - make the calendar grid.
			self.controlsInput.text( o.monthsOfYear[self.theDate.getMonth()] + " " + self.theDate.getFullYear() );
			self.controlsSet.html('');
			
			calmode = {'today': -1, 'highlightDay': -1, 'presetDay': -1, 'nexttoday': 1,
				'thisDate': new Date(), 'maxDate': new Date(), 'minDate': new Date(),
				'currentMonth': false, 'weekMode': 0, 'weekDays': null, 'thisTheme': o.pickPageButtonTheme };
			calmode.start = self._getFirstDay(self.theDate);
			calmode.end = self._getLastDate(self.theDate);
			calmode.lastend = self._getLastDateBefore(self.theDate);
			calmode.presetDate = self._makeDate(self.input.val());	
						
			if ( o.calStartDay > 0 ) {
				calmode.start = calmode.start - o.calStartDay;
				if ( calmode.start < 0 ) { calmode.start = calmode.start + 7; }
			}
			
			calmode.prevtoday = calmode.lastend - (calmode.start - 1);
			calmode.checkDates = ( o.afterToday !== false || o.beforeToday !== false || o.notToday !== false || o.maxDays !== false || o.minDays !== false || o.blackDates !== false || o.blackDays !== false );
				
			if ( calmode.thisDate.getMonth() === self.theDate.getMonth() && calmode.thisDate.getFullYear() === self.theDate.getFullYear() ) { calmode.currentMonth = true; calmode.highlightDay = calmode.thisDate.getDate(); } 
			if ( self._checker(calmode.presetDate) === self._checker(self.theDate) ) { calmode.presetDay = calmode.presetDate.getDate(); }
			
			self.calNoPrev = false; self.calNoNext = false;
			
			if ( o.afterToday === true && 
				( calmode.currentMonth === true || ( calmode.thisDate.getMonth() >= self.theDate.getMonth() && self.theDate.getFullYear() === calmode.thisDate.getFullYear() ) ) ) { 
				self.calNoPrev = true; }
			if ( o.beforeToday === true &&
				( calmode.currentMonth === true || ( calmode.thisDate.getMonth() <= self.theDate.getMonth() && self.theDate.getFullYear() === calmode.thisDate.getFullYear() ) ) ) {
				self.calNoNext = true; }
			
			if ( o.minDays !== false ) {
				calmode.minDate.setDate(calmode.minDate.getDate() - o.minDays);
				if ( self.theDate.getFullYear() === calmode.minDate.getFullYear() && self.theDate.getMonth() <= calmode.minDate.getMonth() ) { self.calNoPrev = true;}
			}
			if ( o.maxDays !== false ) {
				calmode.maxDate.setDate(calmode.maxDate.getDate() + o.maxDays);
				if ( self.theDate.getFullYear() === calmode.maxDate.getFullYear() && self.theDate.getMonth() >= calmode.maxDate.getMonth() ) { self.calNoNext = true;}
			}
			
			if ( o.calShowDays ) {
				if ( o.daysOfWeekShort.length < 8 ) { o.daysOfWeekShort = o.daysOfWeekShort.concat(o.daysOfWeekShort); }
				calmode.weekDays = $("<div>", {'class':'ui-datebox-gridrow'}).appendTo(self.controlsSet);
				for ( i=0; i<=6;i++ ) {
					$("<div>"+o.daysOfWeekShort[i+o.calStartDay]+"</div>").addClass('ui-datebox-griddate ui-datebox-griddate-empty ui-datebox-griddate-label').appendTo(calmode.weekDays);
				}
			}
			
			for ( gridWeek=0; gridWeek<=5; gridWeek++ ) {
				if ( gridWeek === 0 || ( gridWeek > 0 && (calmode.today > 0 && calmode.today <= calmode.end) ) ) {
					thisRow = $("<div>", {'class': 'ui-datebox-gridrow'}).appendTo(self.controlsSet);
					for ( gridDay=0; gridDay<=6; gridDay++) {
						if ( gridDay === 0 ) { calmode.weekMode = ( calmode.today < 1 ) ? (calmode.prevtoday - calmode.lastend + o.calWeekModeFirstDay) : (calmode.today + o.calWeekModeFirstDay); }
						if ( gridDay === calmode.start && gridWeek === 0 ) { calmode.today = 1; }
						if ( calmode.today > calmode.end ) { calmode.today = -1; }
						if ( calmode.today < 1 ) {
							if ( o.calShowOnlyMonth ) {
								$("<div>", {'class': 'ui-datebox-griddate ui-datebox-griddate-empty'}).appendTo(thisRow);
							} else {
								if (
									( o.blackDays !== false && $.inArray(gridDay, o.blackDays) > -1 ) ||
									( o.blackDates !== false && $.inArray(self._isoDate(self.theDate.getFullYear(), (self.theDate.getMonth()), calmode.prevtoday), o.blackDates) > -1 ) ||
									( o.blackDates !== false && $.inArray(self._isoDate(self.theDate.getFullYear(), (self.theDate.getMonth()+2), calmode.nexttoday), o.blackDates) > -1 ) ) {
										skipThis = true;
								} else { skipThis = false; }
									
								if ( gridWeek === 0 ) {
									$("<div>"+String(calmode.prevtoday)+"</div>")
										.addClass('ui-datebox-griddate ui-datebox-griddate-empty').appendTo(thisRow)
										.attr('data-date', ((o.calWeekMode)?(calmode.weekMode+calmode.lastend):calmode.prevtoday))
										.bind((!skipThis)?'vclick':'error', function(e) {
											e.preventDefault();
											if ( !self.calNoPrev ) {
												self.theDate.setMonth(self.theDate.getMonth() - 1);
												self.theDate.setDate($(this).attr('data-date'));
												self.input.trigger('datebox', {'method':'set', 'value':self._formatDate(self.theDate)});
												self.input.trigger('datebox', {'method':'close'});
											}
										});
									calmode.prevtoday++;
								} else {
									$("<div>"+String(calmode.nexttoday)+"</div>")
										.addClass('ui-datebox-griddate ui-datebox-griddate-empty').appendTo(thisRow)
										.attr('data-date', ((o.calWeekMode)?calmode.weekMode:calmode.nexttoday))
										.bind((!skipThis)?'vclick':'error', function(e) {
											e.preventDefault();
											if ( !self.calNoNext ) {
												self.theDate.setDate($(this).attr('data-date'));
												if ( !o.calWeekMode ) { self.theDate.setMonth(self.theDate.getMonth() + 1); }
												self.input.trigger('datebox', {'method':'set', 'value':self._formatDate(self.theDate)});
												self.input.trigger('datebox', {'method':'close'});
											}
										});
									calmode.nexttoday++;
								}
							}
						} else {
							skipThis = false;
							if ( calmode.checkDates ) {
								if ( o.afterToday && self._checker(calmode.thisDate) > (self._checker(self.theDate)+calmode.today-self.theDate.getDate()) ) {
									skipThis = true;
								} 
								if ( !skipThis && o.beforeToday && self._checker(calmode.thisDate) < (self._checker(self.theDate)+calmode.today-self.theDate.getDate()) ) {
									skipThis = true;
								}
								if ( !skipThis && o.notToday && calmode.today === calmode.highlightDay ) {
									skipThis = true;
								}
								if ( !skipThis && o.maxDays !== false && self._checker(calmode.maxDate) < (self._checker(self.theDate)+calmode.today-self.theDate.getDate()) ) {
									skipThis = true;
								} 
								if ( !skipThis && o.minDays !== false && self._checker(calmode.minDate) > (self._checker(self.theDate)+calmode.today-self.theDate.getDate()) ) {
									skipThis = true;
								} 
								if ( !skipThis && ( o.blackDays !== false || o.blackDates !== false ) ) { // Blacklists
									if ( 
										( $.inArray(gridDay, o.blackDays) > -1 ) ||
										( $.inArray(self._isoDate(self.theDate.getFullYear(), self.theDate.getMonth()+1, calmode.today), o.blackDates) > -1 ) ) { 
											skipThis = true;
									}
								}
							}
							
							if ( o.calHighPicked && calmode.today === calmode.presetDay ) { 
								calmode.thisTheme = o.pickPageHighButtonTheme;
							} else if ( o.calHighToday && calmode.today === calmode.highlightDay ) {
								calmode.thisTheme = o.pickPageTodayButtonTheme;
							} else if ( $.isArray(o.highDates) && ($.inArray(self._isoDate(self.theDate.getFullYear(), self.theDate.getMonth()+1, calmode.today), o.highDates) > -1 ) ) {
								calmode.thisTheme = o.pickPageOHighButtonTheme;
							} else if ( $.isArray(o.highDays) && $.inArray(gridDay, o.highDays) > -1 ) {
								calmode.thisTheme = o.pickPageODHighButtonTheme;
							} else {
								calmode.thisTheme = o.pickPageButtonTheme;
							}
							
							$("<div>"+String(calmode.today)+"</div>")
								.addClass('ui-datebox-griddate ui-corner-all')
								.attr('data-date', ((o.calWeekMode)?calmode.weekMode:calmode.today))
								.attr('data-theme', calmode.thisTheme)
								.appendTo(thisRow)
								.addClass('ui-btn-up-'+calmode.thisTheme)
								.bind('vmouseover vmouseout', function() { 
									if ( o.calWeekMode !== false && o.calWeekModeHighlight === true ) {
										$(this).parent().find('div').each(function() { self._hoover(this); });
									} else { self._hoover(this); }
								})
								.bind((!skipThis)?'vclick':'error', function(e) {
										e.preventDefault();
										self.theDate.setDate($(this).attr('data-date'));
										self.input.trigger('datebox', {'method':'set', 'value':self._formatDate(self.theDate)});
										self.input.trigger('datebox', {'method':'close'});
								})
								.css((skipThis)?'color':'nocolor', o.disabledDayColor);
							
							calmode.today++;
						}
					}
				}
			}
		}
		/* END:CALBOX */
	},
	_create: function() {
		// Create the widget, called automatically by widget system
		var self = this,
			o = $.extend(this.options, this.element.data('options')),
			input = this.element,
			focusedEl = input.wrap('<div class="ui-input-datebox ui-shadow-inset ui-corner-all ui-body-'+ o.theme +'"></div>').parent(),
			theDate = new Date(), // Internal date object, used for all operations
			initDate = new Date(theDate.getTime()), // Initilization time - used for duration
			dialogTitle = ((o.titleDialogLabel === false)?((o.mode==='timebox')?o.titleTimeDialogLabel:o.titleDateDialogLabel):o.titleDialogLabel),
			
			// This is the button that is added to the original input
			openbutton = $('<a href="#" class="ui-input-clear" title="date picker">date picker</a>')
				.bind('vclick', function (e) {
					e.preventDefault();
					if ( !o.disabled ) { self.input.trigger('datebox', {'method': 'open'}); }
					setTimeout( function() { $(e.target).closest("a").removeClass($.mobile.activeBtnClass); }, 300);
				})
				.appendTo(focusedEl).buttonMarkup({icon: 'grid', iconpos: 'notext', corners:true, shadow:true})
				.css({'vertical-align': 'middle', 'float': 'right'}),
			thisPage = input.closest('.ui-page'),
			pickPage = $("<div data-role='dialog' class='ui-dialog-datebox' data-theme='" + o.pickPageTheme + "' >" +
						"<div data-role='header' data-backbtn='false' data-theme='a'>" +
							"<div class='ui-title'>" + dialogTitle + "</div>"+
						"</div>"+
						"<div data-role='content'></div>"+
					"</div>")
					.appendTo( $.mobile.pageContainer )
					.page().css('minHeight', '0px').css('zIndex', o.zindex).addClass('pop'),
			pickPageContent = pickPage.find( ".ui-content" ),
			touch = ('ontouchstart' in window),
			START_EVENT = touch ? 'touchstart' : 'mousedown',
			MOVE_EVENT = touch ? 'touchmove' : 'mousemove',
			END_EVENT = touch ? 'touchend' : 'mouseup',
			dragMove = false,
			dragStart = false,
			dragEnd = false,
			dragPos = false,
			dragTarget = false,
			dragThisDelta = 0;
		
        if(o.defaultPickerValue===false && o.defaultDate!==false){
            o.defaultPickerValue = o.defaultDate;
        }

		$('label[for='+input.attr('id')+']').addClass('ui-input-text').css('verticalAlign', 'middle');
		
		/* BUILD:MODE */
		
		if ( o.mode === "timeflipbox" ) { // No header in time flipbox.
			o.headerFormat = ' ';
		}
		
		// Select the appropriate output format if not otherwise specified
		if ( o.timeOutput === false ) {
			o.timeOutput = o.timeFormats[o.timeFormat];
		}
		if ( o.fieldsOrder === false ) {
			switch (o.mode) {
				case 'timebox':
				case 'timeflipbox':
					o.fieldsOrder = o.timeFieldOrder; 
					break;
				case 'slidebox':
					o.fieldsOrder = o.slideFieldOrder; 
					break;
				default:
					o.fieldsOrder = o.dateFieldOrder; 
			}
		}
		
		// For focus mode, disable button, and bind click of input element and it's parent	
		if ( o.noButtonFocusMode || o.useInline || o.noButton ) { openbutton.hide(); }
		
		focusedEl.bind('vclick', function() {
			if ( !o.disabled && o.noButtonFocusMode ) { input.trigger('datebox', {'method': 'open'}); }
		});
		
		
		input
			.removeClass('ui-corner-all ui-shadow-inset')
			.focus(function(){
				if ( ! o.disabled ) {
					focusedEl.addClass('ui-focus');
					if ( o.noButtonFocusMode ) { focusedEl.addClass('ui-focus'); input.trigger('datebox', {'method': 'open'}); }
				}
				input.removeClass('ui-focus');
			})
			.blur(function(){
				focusedEl.removeClass('ui-focus');
				input.removeClass('ui-focus');
			})
			.change(function() {
				self.theDate = self._makeDate(self.input.val());
				self._update();
			});
			
		// Bind the master handler.
		input.bind('datebox', self._dateboxHandler);
		
		// Bind the close button on the DIALOG mode.
		pickPage.find( ".ui-header a").bind('vclick', function(e) {
			e.preventDefault();
			e.stopImmediatePropagation();
			self.input.trigger('datebox', {'method':'close'});
		});

		$.extend(self, {
			pickPage: pickPage,
			thisPage: thisPage,
			pickPageContent: pickPageContent,
			input: input,
			theDate: theDate,
			initDate: initDate,
			focusedEl: focusedEl,
			touch: touch,
			START_DRAG: START_EVENT,
			MOVE_DRAG: MOVE_EVENT,
			END_DRAG: END_EVENT,
			dragMove: dragMove,
			dragStart: dragStart,
			dragEnd: dragEnd,
			dragPos: dragPos
		});
		
		// Check if mousewheel plugin is loaded
		if ( typeof $.event.special.mousewheel !== 'undefined' ) { o.wheelExists = true; }
		
		self._buildPage();
		
		// drag and drop support, all ending and moving events are defined here, start events are handled in _buildPage or update
		if ( o.swipeEnabled ) {
			$(document).bind(self.MOVE_DRAG, function(e) {
				if ( self.dragMove ) {
					if ( o.mode === 'slidebox' ) {
						self.dragEnd = self.touch ? e.originalEvent.changedTouches[0].pageX : e.pageX;
						self.dragTarget.css('marginLeft', (self.dragPos + self.dragEnd - self.dragStart) + 'px');
						e.preventDefault();
						e.stopPropagation();
						return false;
					} else if ( o.mode === 'flipbox' || o.mode === 'timeflipbox' ) {
						self.dragEnd = self.touch ? e.originalEvent.changedTouches[0].pageY : e.pageY;
						self.dragTarget.css('marginTop', (self.dragPos + self.dragEnd - self.dragStart) + 'px');
						e.preventDefault();
						e.stopPropagation();
						return false;
					} else if ( o.mode === 'durationbox' || o.mode === 'timebox' || o.mode === 'datebox' ) {
						self.dragEnd = self.touch ? e.originalEvent.changedTouches[0].pageY : e.pageY;
						if ( (self.dragEnd - self.dragStart) % 2 === 0 ) {
							dragThisDelta = (self.dragEnd - self.dragStart) / -2;
							if ( dragThisDelta < self.dragPos ) {
								self._offset(self.dragTarget, -1*(self.dragTarget==='i'?o.minuteStep:1));
							} else if ( dragThisDelta > self.dragPos ) {
								self._offset(self.dragTarget, 1*(self.dragTarget==='i'?o.minuteStep:1));
							} 
							self.dragPos = dragThisDelta;
						}
						e.preventDefault();
						e.stopPropagation();
						return false;
					}
				} 
			});
			$(document).bind(self.END_DRAG, function(e) {
				if ( self.dragMove ) {
					self.dragMove = false;
					if ( o.mode === 'slidebox' ) {
						if ( self.dragEnd !== false && Math.abs(self.dragStart - self.dragEnd) > 25 ) {
							e.preventDefault();
							e.stopPropagation();
							switch(self.dragTarget.parent().data('rowtype')) {
								case 'y':
									self._offset('y', parseInt(( self.dragStart - self.dragEnd ) / 84, 10));
									break;
								case 'm':
									self._offset('m', parseInt(( self.dragStart - self.dragEnd ) / 51, 10));
									break;
								case 'd':
									self._offset('d', parseInt(( self.dragStart - self.dragEnd ) / 32, 10));
									break;
								case 'h':
									self._offset('h', parseInt(( self.dragStart - self.dragEnd ) / 32, 10));
									break;
								case 'i':
									self._offset('i', parseInt(( self.dragStart - self.dragEnd ) / 32, 10));
									break;
							}
						}
					} else if ( o.mode === 'flipbox' || o.mode === 'timeflipbox' ) {
						if ( self.dragEnd !== false ) {
							e.preventDefault();
							e.stopPropagation();
							self._offset(self.dragTarget.parent().parent().data('field'), parseInt(( self.dragStart - self.dragEnd ) / 30, 10));
						}
					}
					self.dragStart = false;
					self.dragEnd = false;
				}
			});
		}
		
		// Disable when done if element attribute disabled is true.
		if ( input.is(':disabled') ) {
			self.disable();
		}
		// Turn input readonly if requested (on by default)
		if ( o.disableManualInput === true ) {
			input.attr("readonly", true);
		}
	},
	_buildPage: function () {
		// Build the controls
		var self = this,
			o = self.options, x, newHour, fld,
			linkdiv =$("<div><a href='#'></a></div>"),
			pickerContent = $("<div>", { "class": 'ui-datebox-container ui-overlay-shadow ui-corner-all ui-datebox-hidden pop ui-body-'+o.pickPageTheme} ).css('zIndex', o.zindex),
			templInput = $("<input type='text' />").addClass('ui-input-text ui-corner-all ui-shadow-inset ui-datebox-input ui-body-'+o.pickPageInputTheme),
			templControls = $("<div>", { "class":'ui-datebox-controls' }),
			templFlip = $("<div class='ui-overlay-shadow'><ul></ul></div>"),
			controlsPlus, controlsInput, controlsMinus, controlsSet, controlsHeader,
			pickerHour, pickerMins, pickerMeri, pickerMon, pickerDay, pickerYar, pickerSecs,
			calNoNext = false,
			calNoPrev = false,
			screen = $("<div>", {'class':'ui-datebox-screen ui-datebox-hidden'+((o.useModal)?' ui-datebox-screen-modal':'')})
				.css({'z-index': o.zindex-1})
				.appendTo(self.thisPage)
				.bind("vclick", function(event) {
					event.preventDefault();
					self.input.trigger('datebox', {'method':'close'});
				});
		
		if ( o.noAnimation ) { pickerContent.removeClass('pop'); }
		
		/* BEGIN:FLIPBOX */
		if ( o.mode === 'flipbox' || o.mode === 'timeflipbox' ) {
			controlsHeader = $("<div class='ui-datebox-header'><h4>Unitialized</h4></div>").appendTo(pickerContent).find("h4");
			controlsInput = $("<div>", {"class":'ui-datebox-flipcontent'}).appendTo(pickerContent);
			controlsPlus = $("<div>", {"class":'ui-datebox-flipcenter ui-overlay-shadow'}).appendTo(pickerContent);
			controlsSet = templControls.clone().appendTo(pickerContent);
			
			pickerDay = templFlip.clone().attr('data-field', 'd');
			pickerMon = templFlip.clone().attr('data-field', 'm');
			pickerYar = templFlip.clone().attr('data-field', 'y');
			pickerHour = templFlip.clone().attr('data-field', 'h');
			pickerMins = templFlip.clone().attr('data-field', 'i');
			pickerMeri = templFlip.clone().attr('data-field', 'a');
			
			if ( o.wheelExists ) { // Mousewheel operation, if the plugin is loaded.
				pickerYar.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('y', (d<0)?-1:1); });
				pickerMon.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('m', (d<0)?-1:1); });
				pickerDay.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('d', (d<0)?-1:1); });
				pickerHour.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('h', (d<0)?-1:1); });
				pickerMins.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('i', ((d<0)?-1:1)*o.minuteStep); });
				pickerMeri.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('a', d); });
				controlsPlus.bind('mousewheel', function(e,d) { 
					e.preventDefault();
					if ( o.fieldsOrder.length === 3 ) {
						fld = o.fieldsOrder[parseInt((e.pageX - $(e.currentTarget).offset().left) / 87, 10)];
					} else if ( o.fieldsOrder.length === 2 ) {
						fld = o.fieldsOrder[parseInt((e.pageX - $(e.currentTarget).offset().left) / 130, 10)];
					}
					self._offset(fld, ((d<0)?-1:1) * ((fld==="i")?o.minuteStep:1));
				});
			}
			
			for(x=0; x<=o.fieldsOrder.length; x++) { // Use fieldsOrder to decide which to show.
				if (o.fieldsOrder[x] === 'y') { pickerYar.appendTo(controlsInput); }
				if (o.fieldsOrder[x] === 'm') { pickerMon.appendTo(controlsInput); }
				if (o.fieldsOrder[x] === 'd') { pickerDay.appendTo(controlsInput); }
				if (o.fieldsOrder[x] === 'h') { pickerHour.appendTo(controlsInput); }
				if (o.fieldsOrder[x] === 'i') { pickerMins.appendTo(controlsInput); }
				if (o.fieldsOrder[x] === 'a' && o.timeFormat === 12 ) { pickerMeri.appendTo(controlsInput); }
			}
			
			if ( o.swipeEnabled ) { // Drag and drop support
				controlsInput.find('ul').bind(self.START_DRAG, function(e,f) {
					if ( !self.dragMove ) {
						if ( typeof f !== "undefined" ) { e = f; }
						self.dragMove = true;
						self.dragTarget = $(this).find('li').first();
						self.dragPos = parseInt(self.dragTarget.css('marginTop').replace(/px/i, ''),10);
						self.dragStart = self.touch ? e.originalEvent.changedTouches[0].pageY : e.pageY;
						self.dragEnd = false;
						e.stopPropagation();
						e.preventDefault();
					}
				});
				controlsPlus.bind(self.START_DRAG, function(e) {
					if ( !self.dragMove ) {
						self.dragTarget = self.touch ? e.originalEvent.changedTouches[0].pageX - $(e.currentTarget).offset().left : e.pageX - $(e.currentTarget).offset().left;
						if ( o.fieldsOrder.length === 3 ) {
							$(self.controlsInput.find('ul').get(parseInt(self.dragTarget / 87, 10))).trigger(self.START_DRAG, e);
						} else if ( o.fieldsOrder.length === 2 ) {
							$(self.controlsInput.find('ul').get(parseInt(self.dragTarget / 130, 10))).trigger(self.START_DRAG, e);
						}
					}
				});
			}
			
			if ( o.noSetButton === false ) { // Set button at bottom
				$("<a href='#'>" + ((o.mode==='timeflipbox')?o.setTimeButtonLabel:o.setDateButtonLabel) + "</a>")
					.appendTo(controlsSet).buttonMarkup({theme: o.pickPageTheme, icon: 'check', iconpos: 'left', corners:true, shadow:true})
					.bind('vclick', function(e) {
						e.preventDefault();
						if ( o.mode === 'timeflipbox' ) { self.input.trigger('datebox', {'method':'set', 'value':self._formatTime(self.theDate)}); }
						else { self.input.trigger('datebox', {'method':'set', 'value':self._formatDate(self.theDate)}); }
						self.input.trigger('datebox', {'method':'close'});
					});
			}
			
			$.extend(self, {
				controlsHeader: controlsHeader,
				controlsInput: controlsInput,
				pickerDay: pickerDay,
				pickerMon: pickerMon,
				pickerYar: pickerYar,
				pickerHour: pickerHour,
				pickerMins: pickerMins,
				pickerMeri: pickerMeri
			});
			
			pickerContent.appendTo(self.thisPage);
			
		}
		/* END:FLIPBOX */
		/* BEGIN:DURATIONBOX */
		if ( o.mode === 'durationbox' ) {
			controlsPlus = templControls.clone().removeClass('ui-datebox-controls').addClass('ui-datebox-scontrols').appendTo(pickerContent);
			controlsInput = controlsPlus.clone().appendTo(pickerContent);
			controlsMinus = controlsPlus.clone().appendTo(pickerContent);
			controlsSet = templControls.clone().appendTo(pickerContent);
			
			pickerDay = templInput.removeClass('ui-datebox-input').clone()
				.keyup(function() {	if ( $(this).val() !== '' ) { self._updateduration(); } });
				
			pickerHour = pickerDay.clone().keyup(function() {	if ( $(this).val() !== '' ) { self._updateduration(); } });
			pickerMins = pickerDay.clone().keyup(function() {	if ( $(this).val() !== '' ) { self._updateduration(); } });
			pickerSecs = pickerDay.clone().keyup(function() {	if ( $(this).val() !== '' ) { self._updateduration(); } });
			
			if ( o.wheelExists ) { // Mousewheel operation, if the plgin is loaded
					pickerDay.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('d', ((d<0)?-1:1)*o.durationSteppers['d']); });
					pickerHour.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('h', ((d<0)?-1:1)*o.durationSteppers['h']); });
					pickerMins.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('i', ((d<0)?-1:1)*o.durationSteppers['i']); });
					pickerSecs.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('s', ((d<0)?-1:1)*o.durationSteppers['s']); });
				}
			
			for ( x=0; x<o.durationOrder.length; x++ ) { // Use durationOrder to decide what goes where
				switch ( o.durationOrder[x] ) {
					case 'd':
						$('<div>', {'class': 'ui-datebox-sinput', 'data-field': 'd'}).append(pickerDay).appendTo(controlsInput).prepend('<label>'+o.durationLabel[0]+'</label>');
						break;
					case 'h':
						$('<div>', {'class': 'ui-datebox-sinput', 'data-field': 'h'}).append(pickerHour).appendTo(controlsInput).prepend('<label>'+o.durationLabel[1]+'</label>');
						break;
					case 'i':
						$('<div>', {'class': 'ui-datebox-sinput', 'data-field': 'i'}).append(pickerMins).appendTo(controlsInput).prepend('<label>'+o.durationLabel[2]+'</label>');
						break;
					case 's':
						$('<div>', {'class': 'ui-datebox-sinput', 'data-field': 's'}).append(pickerSecs).appendTo(controlsInput).prepend('<label>'+o.durationLabel[3]+'</label>');
						break;
				}
			}
			
			if ( o.swipeEnabled ) { // Drag and drop operation
				controlsInput.find('input').bind(self.START_DRAG, function(e) {
					if ( !self.dragMove ) {
						self.dragMove = true;
						self.dragTarget = $(this).parent().data('field');
						self.dragPos = 0;
						self.dragStart = self.touch ? e.originalEvent.changedTouches[0].pageY : e.pageY;
						self.dragEnd = false;
						e.stopPropagation();
					}
				});
			}
			
			if ( o.noSetButton === false ) { // Bottom set button
				$("<a href='#'>" + o.setDurationButtonLabel + "</a>")
					.appendTo(controlsSet).buttonMarkup({theme: o.pickPageTheme, icon: 'check', iconpos: 'left', corners:true, shadow:true})
					.bind('vclick', function(e) {
						e.preventDefault();
						self.input.trigger('datebox', {'method':'set', 'value':self._formatTime(self.theDate)});
						self.input.trigger('datebox', {'method':'close'});
					});
			}
				
			for ( x=0; x<o.durationOrder.length; x++ ) {
				linkdiv.clone()
					.appendTo(controlsPlus).buttonMarkup({theme: o.pickPageButtonTheme, icon: 'plus', iconpos: 'bottom', corners:true, shadow:true})
					.attr('data-field', o.durationOrder[x])
					.bind('vclick', function(e) {
						e.preventDefault();
						self._offset($(this).attr('data-field'),o.durationSteppers[$(this).attr('data-field')]);
					});
					
				linkdiv.clone()
					.appendTo(controlsMinus).buttonMarkup({theme: o.pickPageButtonTheme, icon: 'minus', iconpos: 'top', corners:true, shadow:true})
					.attr('data-field', o.durationOrder[x])
					.bind('vclick', function(e) {
						e.preventDefault();
						self._offset($(this).attr('data-field'),-1*o.durationSteppers[$(this).attr('data-field')]);
					});
			}
			
			$.extend(self, {
				pickerHour: pickerHour,
				pickerMins: pickerMins,
				pickerDay: pickerDay,
				pickerSecs: pickerSecs
			});
			
			pickerContent.appendTo(self.thisPage);
		}
		/* END:DURATIONBOX */
		/* BEGIN:DATETIME */
		if ( o.mode === 'datebox' || o.mode === 'timebox' ) {
			controlsHeader = $("<div class='ui-datebox-header'><h4>Unitialized</h4></div>").appendTo(pickerContent).find("h4");
			controlsPlus = templControls.clone().appendTo(pickerContent);
			controlsInput = templControls.clone().appendTo(pickerContent);
			controlsMinus = templControls.clone().appendTo(pickerContent);
			controlsSet = templControls.clone().appendTo(pickerContent);
			
			if ( o.mode === 'timebox' ) { controlsHeader.parent().html(''); } // Time mode has no header
			
			pickerMon = templInput.clone()
				.attr('data-field', 'm')
				.keyup(function() {
					if ( $(this).val() !== '' && self._isInt($(this).val()) ) {
						self.theDate.setMonth(parseInt($(this).val(),10)-1);
						self._update();
					}
				});
				
			pickerDay = pickerMon.clone()
				.attr('data-field', 'd')
				.keyup(function() {
					if ( $(this).val() !== '' && self._isInt($(this).val()) ) {
						self.theDate.setDate(parseInt($(this).val(),10));
						self._update();
					}
				});
				
			pickerYar = pickerMon.clone()
				.attr('data-field', 'y')
				.keyup(function() {
					if ( $(this).val() !== '' && self._isInt($(this).val()) ) {
						self.theDate.setFullYear(parseInt($(this).val(),10));
						self._update();
					}
				});
				
			pickerHour = templInput.clone()
				.attr('data-field', 'h')
				.keyup(function() {
					if ( $(this).val() !== '' && self._isInt($(this).val()) ) {
						newHour = parseInt($(this).val(),10);
						if ( newHour === 12 ) {
							if ( o.timeFormat === 12 && pickerMeri.val() === o.meridiemLetters[0] ) { newHour = 0; }
						}
						self.theDate.setHours(newHour);
						self._update();
					}
				});
				
			pickerMins = templInput.clone()
				.attr('data-field', 'i')
				.keyup(function() {
					if ( $(this).val() !== '' && self._isInt($(this).val()) ) {
						self.theDate.setMinutes(parseInt($(this).val(),10));
						self._update();
					}
				});
				
			pickerMeri = templInput.clone()
				.attr('data-field', 'a')
				.keyup(function() {
					if ( $(this).val() !== '' ) {
						self._update();
					}
				});
					
			if ( o.wheelExists ) { // Mousewheel operation, if plugin is loaded
				pickerYar.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('y', (d<0)?-1:1); });
				pickerMon.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('m', (d<0)?-1:1); });
				pickerDay.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('d', (d<0)?-1:1); });
				pickerHour.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('h', (d<0)?-1:1); });
				pickerMins.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('i', ((d<0)?-1:1)*o.minuteStep); });
				pickerMeri.bind('mousewheel', function(e,d) { e.preventDefault(); self._offset('a', d); });
			}
		
			for(x=0; x<=o.fieldsOrder.length; x++) { // Use fieldsOrder to decide what goes where
				if (o.fieldsOrder[x] === 'y') { pickerYar.appendTo(controlsInput); }
				if (o.fieldsOrder[x] === 'm') { pickerMon.appendTo(controlsInput); }
				if (o.fieldsOrder[x] === 'd') { pickerDay.appendTo(controlsInput); }
				if (o.fieldsOrder[x] === 'h') { pickerHour.appendTo(controlsInput); }
				if (o.fieldsOrder[x] === 'i') { pickerMins.appendTo(controlsInput); }
				if (o.fieldsOrder[x] === 'a' && o.timeFormat === 12 ) { pickerMeri.appendTo(controlsInput); }
			}
			
			if ( o.swipeEnabled ) { // Drag and drop support
				controlsInput.find('input').bind(self.START_DRAG, function(e) {
					if ( !self.dragMove ) {
						self.dragMove = true;
						self.dragTarget = $(this).data('field');
						self.dragPos = 0;
						self.dragStart = self.touch ? e.originalEvent.changedTouches[0].pageY : e.pageY;
						self.dragEnd = false;
						e.stopPropagation();
					}
				});
			}
			
			if ( o.noSetButton === false ) { // Set button at bottom
				$("<a href='#'>" + ((o.mode==='timebox')?o.setTimeButtonLabel:o.setDateButtonLabel) + "</a>")
					.appendTo(controlsSet).buttonMarkup({theme: o.pickPageTheme, icon: 'check', iconpos: 'left', corners:true, shadow:true})
					.bind('vclick', function(e) {
						e.preventDefault();
						if ( o.mode === 'timebox' ) { self.input.trigger('datebox', {'method':'set', 'value':self._formatTime(self.theDate)}); }
						else { self.input.trigger('datebox', {'method':'set', 'value':self._formatDate(self.theDate)}); }
						self.input.trigger('datebox', {'method':'close'});
					});
			}
			
			for( x=0; x<self.options.fieldsOrder.length; x++ ) { // Generate the plus and minus buttons, use fieldsOrder again
				if ( o.fieldsOrder[x] !== 'a' || o.timeFormat === 12 ) {
					linkdiv.clone()
						.appendTo(controlsPlus).buttonMarkup({theme: o.pickPageButtonTheme, icon: 'plus', iconpos: 'bottom', corners:true, shadow:true})
						.attr('data-field', o.fieldsOrder[x])
						.bind('vclick', function(e) {
							e.preventDefault();
							self._offset($(this).attr('data-field'),1*($(this).attr('data-field')==='i'?o.minuteStep:1));
					});
					linkdiv.clone()
						.appendTo(controlsMinus).buttonMarkup({theme: o.pickPageButtonTheme, icon: 'minus', iconpos: 'top', corners:true, shadow:true})
						.attr('data-field', o.fieldsOrder[x])
						.bind('vclick', function(e) {
							e.preventDefault();
							self._offset($(this).attr('data-field'),-1*($(this).attr('data-field')==='i'?o.minuteStep:1));
					});
				}
			}
				
			$.extend(self, {
				controlsHeader: controlsHeader,
				pickerDay: pickerDay,
				pickerMon: pickerMon,
				pickerYar: pickerYar,
				pickerHour: pickerHour,
				pickerMins: pickerMins,
				pickerMeri: pickerMeri
			});
			
			pickerContent.appendTo(self.thisPage);
		}
		/* END:DATETIME */
		/* BEGIN:CALBOX */
		if ( o.mode === 'calbox' ) {
			controlsHeader = $("<div>", {"class": 'ui-datebox-gridheader'}).appendTo(pickerContent);
			controlsSet = $("<div>", {"class": 'ui-datebox-grid'}).appendTo(pickerContent);
			controlsInput = $("<div class='ui-datebox-gridlabel'><h4>Uninitialized</h4></div>").appendTo(controlsHeader).find('h4');
			
			if ( o.swipeEnabled ) { // Calendar swipe left and right
				pickerContent
					.bind('swipeleft', function() { if ( !self.calNoNext ) { self._offset('m', 1); } })
					.bind('swiperight', function() { if ( !self.calNoPrev ) { self._offset('m', -1); } });
			}
			
			if ( o.wheelExists) { // Mousewheel operations, if plugin is loaded
				pickerContent.bind('mousewheel', function(e,d) {
					e.preventDefault();
					if ( d > 0 && !self.calNoNext ) { 
						if ( self.theDate.getDate() > 28 ) { self.theDate.setDate(1); }
						self._offset('m', 1);
					}
					if ( d < 0 && !self.calNoPrev ) {
						if ( self.theDate.getDate() > 28 ) { self.theDate.setDate(1); }
						self._offset('m', -1);
					}
				});
			}
						
			// Previous and next month buttons, define booleans to decide if they should do anything
			$("<div class='ui-datebox-gridplus'><a href='#'>Next Month</a></div>")
				.prependTo(controlsHeader).buttonMarkup({theme: o.pickPageButtonTheme, icon: 'plus', inline: true, iconpos: 'notext', corners:true, shadow:true})
				.bind('vclick', function(e) {
					e.preventDefault();
					if ( ! self.calNoNext ) {
						if ( self.theDate.getDate() > 28 ) { self.theDate.setDate(1); }
						self._offset('m',1);
					}
				});
			$("<div class='ui-datebox-gridminus'><a href='#'>Prev Month</a></div>")
				.prependTo(controlsHeader).buttonMarkup({theme: o.pickPageButtonTheme, icon: 'minus', inline: true, iconpos: 'notext', corners:true, shadow:true})
				.bind('vclick', function(e) {
					e.preventDefault();
					if ( ! self.calNoPrev ) {
						if ( self.theDate.getDate() > 28 ) { self.theDate.setDate(1); }
						self._offset('m',-1);
					}
				});
				
			if ( o.calTodayButton === true ) { // Show today button at bottom
				$("<a href='#'>" + o.calTodayButtonLabel + "</a>")
					.appendTo(pickerContent).buttonMarkup({theme: o.pickPageTheme, icon: 'check', iconpos: 'left', corners:true, shadow:true})
					.bind('vclick', function(e) {
						e.preventDefault();
						self.theDate = new Date();
						self.theDate = new Date(self.theDate.getFullYear(), self.theDate.getMonth(), self.theDate.getDate(), 0,0,0,0);
						self.input.trigger('datebox', {'method':'doset'});
					});
			}
					
			$.extend(self, {
				controlsInput: controlsInput,
				controlsSet: controlsSet,
				calNoNext: calNoNext,
				calNoPrev: calNoPrev
			});
			
			pickerContent.appendTo(self.thisPage);
		}
		/* END:CALBOX */
		/* BEGIN:SLIDEBOX */
		if ( o.mode === 'slidebox' ) {
			controlsHeader = $("<div class='ui-datebox-header'><h4>Unitialized</h4></div>").appendTo(pickerContent).find("h4");
			controlsInput = $('<div>').addClass('ui-datebox-slide').appendTo(pickerContent);
			controlsSet = $("<div>", { "class":'ui-datebox-controls'}).appendTo(pickerContent);
				
			if ( o.noSetButton === false ) { // Show set button at bottom
				$("<a href='#'>" + o.setDateButtonLabel + "</a>")
					.appendTo(controlsSet).buttonMarkup({theme: o.pickPageTheme, icon: 'check', iconpos: 'left', corners:true, shadow:true})
					.bind('vclick', function(e) {
						e.preventDefault();
						self.input.trigger('datebox', {'method':'set', 'value':self._formatDate(self.theDate)});
						self.input.trigger('datebox', {'method':'close'});
					});
			}
			
			$.extend(self, {
				controlsHeader: controlsHeader,
				controlsInput: controlsInput
			});
			
			pickerContent.appendTo(self.thisPage);
		}
		/* END:SLIDEBOX */

		$.extend(self, {
			pickerContent: pickerContent,
			screen: screen
		});
		
		// If useInline mode, drop it into the document, and stop a few events from working (or just hide the trigger)
		if ( o.useInline ) { 
			self.input.parent().parent().append(self.pickerContent);
			if ( o.useInlineHideInput ) { self.input.parent().hide(); }
			self.input.trigger('change');
			self.pickerContent.removeClass('ui-datebox-hidden');
		}
			
	},
	refresh: function() {
		// Pulic shortcut to _update, with an extra hook for inline mode.
		if ( this.options.useInline === true ) {
			this.input.trigger('change');
		}
		this._update();
	},
	open: function() {
		// Open the controls
		if ( this.options.useInline ) { return false; } // Ignore if inline
		if ( this.pickPage.is(':visible') ) { return false; } // Ignore if already open
		
		this.input.trigger('change').blur(); // Grab latest value of input, in case it changed
		
		var self = this,
			o = this.options,
			inputOffset = self.focusedEl.offset(),
			pickWinHeight = self.pickerContent.outerHeight(),
			pickWinWidth = self.pickerContent.innerWidth(),
			pickWinTop = inputOffset.top + ( self.focusedEl.outerHeight() / 2 )- ( pickWinHeight / 2),
			pickWinLeft = inputOffset.left + ( self.focusedEl.outerWidth() / 2) - ( pickWinWidth / 2),
			transition = o.noAnimation ? 'none' : 'pop',
			activePage;
			
		// TOO FAR RIGHT TRAP
		if ( (pickWinLeft + pickWinWidth) > $(document).width() ) {
			pickWinLeft = $(document).width() - pickWinWidth - 1;
		}
		// TOO FAR LEFT TRAP
		if ( pickWinLeft < 0 ) {
			pickWinLeft = 0;
		}
		// Center popup on request - centered in document, not any containing div. 
		if ( o.centerWindow ) {
			pickWinLeft = ( $(document).width() / 2 ) - ( pickWinWidth / 2 );
		}
		
		if ( (pickWinHeight + pickWinTop) > $(document).height() ) {
			pickWinTop = $(document).height() - (pickWinHeight + 2);
		}
		if ( pickWinTop < 45 ) { pickWinTop = 45; }
		
		// If the window is less than 400px wide, use the jQM dialog method unless otherwise forced
		if ( ( $(document).width() > 400 && !o.useDialogForceTrue ) || o.useDialogForceFalse ) {
			o.useDialog = false;
			if ( o.nestedBox ) { 
				if ( pickWinHeight === 0 ) { // The box may have no height since it dosen't exist yet.  working on it.
					pickWinHeight = 250;
					pickWinTop = inputOffset.top + ( self.focusedEl.outerHeight() / 2 )- ( pickWinHeight / 2);
				}
				activePage = $('.ui-page-active').first(); 
				$(activePage).append(self.pickerContent);
				$(activePage).append(self.screen);
			}
			if ( o.useModal ) { // If model, fade the background screen
				self.screen.fadeIn('slow');
			} else { // Else just unhide it since it's transparent
				self.screen.removeClass('ui-datebox-hidden');
			}
			self.pickerContent.addClass('ui-overlay-shadow in').css({'position': 'absolute', 'top': pickWinTop, 'left': pickWinLeft}).removeClass('ui-datebox-hidden');
		} else {
			// prevent the parent page from being removed from the DOM,
			self.thisPage.unbind( "pagehide.remove" );
			o.useDialog = true;
			self.pickPageContent.append(self.pickerContent);
			self.pickerContent.css({'top': 'auto', 'left': 'auto', 'marginLeft': 'auto', 'marginRight': 'auto'}).removeClass('ui-overlay-shadow ui-datebox-hidden');
			$.mobile.changePage(self.pickPage, {'transition': transition});
		}
	},
	close: function() {
		// Close the controls
		var self = this,
			callback;

		if ( self.options.useInline ) {
			return true;
		}
		
		// Check options to see if we are closing a dialog, or removing a popup
		if ( self.options.useDialog ) {
			$(self.pickPage).dialog('close');
			if( !self.thisPage.data("page").options.domCache ){
				self.thisPage.bind( "pagehide.remove", function() {
					$(this).remove();
				});
			}
			self.pickerContent.addClass('ui-datebox-hidden').removeAttr('style').css('zIndex', self.options.zindex);
			self.thisPage.append(self.pickerContent);
		} else {
			if ( self.options.useModal ) {
				self.screen.fadeOut('slow');
			} else {
				self.screen.addClass('ui-datebox-hidden');
			}
			self.pickerContent.addClass('ui-datebox-hidden').removeAttr('style').css('zIndex', self.options.zindex).removeClass('in');
		}
		self.focusedEl.removeClass('ui-focus');
		
		if ( self.options.closeCallback !== false ) { callback = new Function(self.options.closeCallback); callback(); }
	},
	disable: function(){
		// Disable the element
		this.element.attr("disabled",true);
		this.element.parent().addClass("ui-disabled");
		this.options.disabled = true;
		this.element.blur();
		this.input.trigger('datebox', {'method':'disable'});
	},
	enable: function(){
		// Enable the element
		this.element.attr("disabled", false);
		this.element.parent().removeClass("ui-disabled");
		this.options.disabled = false;
		this.input.trigger('datebox', {'method':'enable'});
	}
	
  });
	  
  // Degrade date inputs to text inputs, suppress standard UI functions.
  $( document ).bind( "pagebeforecreate", function( e ) {
	$( ":jqmData(role='datebox')", e.target ).each(function() {
		$(this).replaceWith(
			$( "<div>" ).html( $(this).clone() ).html()
				.replace( /\s+type=["']date['"]?/, " type=\"text\" " )
		);
	});
  });
  // Automatically bind to data-role='datebox' items.
  $( document ).bind( "pagecreate", function( e ){
	$( ":jqmData(role='datebox')", e.target ).datebox();
  });
	
})( jQuery );
