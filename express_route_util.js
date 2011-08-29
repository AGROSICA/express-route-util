// # The *Express Routing Utility*
// is a helper module for Express to provide a Django-inspired controller
// hierarchy (separated from the view hierarchy and URL hierarchy), and a
// URL generation method to be used by the controllers. The controllers are
// defined to use a directory hierarchy like so:
//
//     controllers/
//       controllers.js
//       social/
//         controllers.js
//         helper_lib.js
//
// The URL hierarchy is defined by the user in a simple JSON tree such as:
//
//    {
//        '/': 'index',
//        'get,post/login': 'login',
//        'post/logout': ['common.requireLogin', 'logout'],
//        '/social' : {
//            '/': 'social.index',
//            '/profile': {
//                '/:username': 'social.viewProfile',
//                'get,post/edit': ['common.requireLogin', 'social.editProfile']
//            }
//        }
//    }
//
// URLs are assembled relative to their location in the tree, so the
// ``social.editProfile`` controller would have a URL of
// ``/social/profile/edit/``
//
// Usage:
//    var router = require("./express-route-util");
//    
//    router.setDefaultMethod("get");
//    router.registerRoutes(app, urlJSON, "/path/to/controllers/");
//    var href = router.getControllerUrl("social.viewProfile", {
//        username: "dellis"
//    });
//
// Where ``app`` is the Express application object, ``urlJSON`` is the JSON
// object relating paths to controllers, and ``"/path/to/controllers/"`` is
// the location of the controllers for the project (can be a relative URL).

// This utility loads source files dynamically, and requires the fs and path
// libraries to traverse the directory structure.
var fs = require('fs');
var path = require('path');
var express = require('express');

// A hash of controllers to URL Paths
var controllerToPathHash = {};
var defaultMethod = "get";

// ## The *mergeObjs* function
// is a helper function that clones the value of various object into a new one.
// This simplistic one is fast, but assumes no recursive objects to merge.
function mergeObjs() {
	var outObj = {};
	for(var i in arguments) {
		if(arguments[i] instanceof Object) {
			for(var j in arguments[i]) {
				// Does not check for collisions, newer object
				// definitions clobber old definitions
				outObj[j] = arguments[i][j];
			}
		}
	}
	return outObj;
}

// ## The *loadControllers* function
// is a recursive function that ``require``s controllers as it traverses the
// controllers directory and places them into their correct place in the
// ``controllerObj`` hierarchy.
function loadControllers(controllerPath, controllerObj) {
	if(path.existsSync(controllerPath)) {
		if(path.existsSync(path.join(controllerPath, 'controllers.js'))) {
			controllerObj = mergeObjs(controllerObj, require(path.join(path.resolve(controllerPath), 'controllers')));
		}
		var pathChildren = fs.readdirSync(controllerPath);
		for(var i = 0; i < pathChildren.length; i++) {
			var childPath = path.resolve(path.join(controllerPath, pathChildren[i]));
			if(fs.statSync(childPath).isDirectory()) {
				if(!controllerObj[pathChildren[i]]) {
					controllerObj[pathChildren[i]] = {};
				}
				controllerObj[pathChildren[i]] = loadControllers(childPath, controllerObj[pathChildren[i]]);
			}
		}
	} else {
		throw new Error("Controller Path Invalid");
	}
	return controllerObj;
}

// ## The *getController* function
// takes a ``controllerRoute`` string and traverses the ``controllers``
// hierarchy to return the specified controller
function getController(controllers, controllerRoute) {
	var controller = controllers;
	var hierarchy = controllerRoute.split('.');
	for(var i = 0; i < hierarchy.length; i++) {
		if(controller[hierarchy[i]]) {
			controller = controller[hierarchy[i]];
		} else {
			throw new Error("Invalid Controller Path Found: " + hierarchy);
		}
	}
	return controller;
}

// ## The *buildRoutes* function
// is a recursive function that traverses the URL routing hierarchy and defines
// the *Express* URL controllers for the HTTP method specified by the
// ``httpMethod`` property attached to the controller. While attaching
// controllers to URLs, it builds the ``controllerToPathHash`` hash table.
function buildRoutes(express, controllers, routeObj, currPath, required) {
	// Construct the `required` objects if not instantiated
	if(!required) { required = {prefix: [], postfix: []}; }
	if(!routeObj.required) { routeObj.required = {prefix: [], postfix: []}; }

	// Set the default `depth` for `required` methods to Infinity, so they affect all levels below them.
	if(!routeObj.required.depth) { routeObj.required.depth = Infinity; }

	// Add the newly-defined required methods to the `required` object
	if(routeObj.required.prefix) { required.prefix = required.prefix.concat(routeObj.required.prefix); }
	if(routeObj.required.postfix) { required.postfix = routeObj.required.postfix.concat(required.postfix); }

	// Remove no-longer applicable methods from the `required` object, and decrement the `depth` counter
	var adjustDepth = function(objArray) {
		for(var i = 0; i < objArray.length; i++) {
			if(typeof(objArray[i]) != "object") { objArray[i] = new String(objArray[i]); }
			if(!objArray[i].depth) { objArray[i].depth = routeObj.required.depth; }
			if(objArray[i].depth < 0) {
				objArray.splice(i, 1);
				i--;
				continue;
			}
			objArray[i].depth--;
		}
	};
	adjustDepth(required.prefix);
	adjustDepth(required.postfix);

	// Construct the routes for all routes in the current object, and traverse down the tree
	for(var route in routeObj) {
		if(route == "required") { continue; } // Not a route

		// This is a leaf-node and construction should occur
		if(typeof(routeObj[route]) == "string" || routeObj[route] instanceof Array) {
			// Initialize the method and URL variables
			var theMethod = defaultMethod;
			var routeUrl = route;

			// Determine the actual HTTP method(s) to use and correct the URL
			if(routeUrl.match(/^(get|post|put|del|all)\//i)) { //Single method type
				theMethod = RegExp.$1.toLowerCase();
				routeUrl = routeUrl.replace(/^(get|post|pul|del|all)/i, "");
			} else if(routeUrl.match(/^([adeglopstu,]+)\//i)) { //Multiple method types
				theMethod = RegExp.$1.toLowerCase().split(",");
				routeUrl = routeUrl.replace(/^([adeglopstu,]*)/i, "");
			}
			
			// Attach the URL path from parent nodes to this node
			var routeUrl = currPath != "" ? path.join(currPath, routeUrl) : routeUrl;

			// Remove trailing slashes except on the root node
			routeUrl = routeUrl != '/' ? routeUrl.replace(/\/$/, '') : '/';

			// Construct an array of strings referencing the desired route methods
			var expressCall = [].concat(required.prefix, routeObj[route], required.postfix);

			// Convert the strings into function references and register the function with the URL lookup hashtable
			for(var i = 0; i < expressCall.length; i++) {
				controllerToPathHash[expressCall[i]] = routeUrl;
				expressCall[i] = getController(controllers, expressCall[i]);
			}

			// Add the path to the beginning of the array to match the Express API
			expressCall.unshift(routeUrl);

			// Attach the controller(s) for the URL for each HTTP method
			if(theMethod instanceof Array) {
				for(var i = 0; i < theMethod.length; i++) {
					express[theMethod[i]].apply(express, expressCall);
				}
			} else {
				express[theMethod].apply(express, expressCall);
			}
		// Recurse into the object and handle its leaves
		} else if(typeof(routeObj[route] == "object") && Object.getPrototypeOf(Object.getPrototypeOf(routeObj[route])) === null) {
			buildRoutes(express, controllers, routeObj[route], path.join(currPath, route), required);
		// Unsupported datatype encountered
		} else {
			throw new Error("Invalid Route Definition");
		}
	}
}

// ## The *registerRoutes* function
// is the external API call that loads the desired source code and attaches the
// controllers to the specified URLs.
exports.registerRoutes = function(server, pathToControllerTree, controllerPath) {
	if(controllerPath == null) {
		controllerPath = "./";
	} else if(typeof(controllerPath) != "string") {
		throw new Error("Path must be a string or not included");
	}
	if(!(server instanceof express.HTTPServer || server instanceof express.HTTPSServer)) {
		throw new Error("Must be given an Express server");
	}
	var controllers = loadControllers(controllerPath, {});
	buildRoutes(server, controllers, pathToControllerTree, "");
};

// ## The *getControllerUrl* function
// is the external API call that parses the path string in the
// ``controllerToPathHash`` and generates an *absolute for the server* URL
exports.getControllerUrl = function(controller, params) {
	var thePath = controllerToPathHash[controller];
	if(!thePath) { throw new Error('Invalid Controller Requested'); }
	for(var param in params) {
		thePath = thePath.replace(new RegExp(":" + param + "\\?*", "g"), params[param]);
	}
	thePath = thePath.replace(/:[^\?]*\?/g, "");
	if(thePath.match(/:/)) {
		throw new Error("Missing required parameter(s): " + thePath);
	}
	thePath = path.join("", thePath);
	return thePath;
};

// ## The *setDefaultMethod* function
exports.setDefaultMethod = function(theMethod) {
	if(theMethod.match(/^(get|post|put|del|all)$/i)) {
		defaultMethod = theMethod.toLowerCase();
	} else {
		throw new Error("Invalid HTTP method name '" + theMethod + "'. Should be: get, post, put, del, or all.");
	}
};

// ## The *DepthString* constructor
// is a helper function for advanced usage of the new `required` properties, to
// let one construct a set of required methods with varying depths. Not sure if
// there is any use-case for this, but the flexibility is there and it won't
// impact anyone to have it.
exports.DepthString = function() {
	var str = "", dpt = Infinity;
	if(typeof(arguments[0]) == "string") { str = arguments[0]; }
	if(typeof(arguments[1]) == "string") { str = arguments[1]; }
	if(typeof(arguments[0]) == "number") { dpt = arguments[0]; }
	if(typeof(arguments[1]) == "number") { dpt = arguments[1]; }

	var dptStr = new String(str);
	dptStr.depth = dpt;
	return dptStr;
};
