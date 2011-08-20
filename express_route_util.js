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
		throw "Controller Path Object Invalid";
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
			throw "Invalid Controller Path Found: " + hierarchy;
		}
	}
	return controller;
}

// ## The *buildRoutes* function
// is a recursive function that traverses the URL routing hierarchy and defines
// the *Express* URL controllers for the HTTP method specified by the
// ``httpMethod`` property attached to the controller. While attaching
// controllers to URLs, it builds the ``controllerToPathHash`` hash table.
function buildRoutes(express, controllers, routeObj, currPath) {
	for(var route in routeObj) {
		if(typeof(routeObj[route]) == "string" || routeObj[route] instanceof Array) {
			var theMethod = defaultMethod;
			var routeUrl = route;
			if(routeUrl.match(/^(get|post|put|del|all)\//i)) { //Single method type
				theMethod = RegExp.$1.toLowerCase();
				routeUrl = routeUrl.replace(/^(get|post|pul|del|all)/i, "");
			} else if(routeUrl.match(/^([adeglopstu,]+)\//i)) { //Multiple method types
				theMethod = RegExp.$1.toLowerCase().split(",");
				routeUrl = routeUrl.replace(/^([adeglopstu,]*)/i, "");
			} else {
				theMethod = defaultMethod;
			}
			var routeUrl = currPath != "" ? path.join(currPath, routeUrl) : routeUrl;
			if(typeof(routeObj[route]) == "string") {
				var controller = getController(controllers, routeObj[route]);
				controllerToPathHash[routeObj[route]] = routeUrl;
				routeUrl = routeUrl != '/' ? routeUrl.replace(/\/$/, "") : '/';
				if(theMethod instanceof Array) {
					for(var i = 0; i < theMethod.length; i++) {
						express[theMethod[i]](routeUrl, controller);
					}
				} else {
					express[theMethod](routeUrl, controller);
				}
			} else {
				var expressCall = [];
				for(var i = 0; i < routeObj[route].length; i++) {
					expressCall[i] = getController(controllers, routeObj[route][i]);
					controllerToPathHash[routeObj[route][i]] = routeUrl;
				}
				routeUrl = routeUrl != '/' ? routeUrl.replace(/\/$/, "") : '/';
				expressCall.unshift(routeUrl);
				if(theMethod instanceof Array) {
					for(var i = 0; i < theMethod.length; i++) {
						express[theMethod[i]].apply(express, expressCall);
					}
				} else {
					express[theMethod].apply(express, expressCall);
				}
			}
		} else if(typeof(routeObj[route] == "object")) {
			buildRoutes(express, controllers, routeObj[route], path.join(currPath, route));
		} else {
			throw "Invalid Route Definition";
		}
	}
}

// ## The *registerRoutes* function
// is the external API call that loads the desired source code and attaches the
// controllers to the specified URLs.
exports.registerRoutes = function(express, pathToControllerTree, controllerPath) {
	if(controllerPath == null) {
		controllerPath = "./";
	} else if(typeof(controllerPath) != "string") {
		throw "Path must be a string or not included";
	}
	var controllers = loadControllers(controllerPath, {});
	buildRoutes(express, controllers, pathToControllerTree, "");
};

// ## The *getControllerUrl* function
// is the external API call that parses the path string in the
// ``controllerToPathHash`` and generates an *absolute for the server* URL
exports.getControllerUrl = function(controller, params) {
	var thePath = controllerToPathHash[controller] || "";
	for(var param in params) {
		thePath = thePath.replace(new RegExp(":" + param + "\\?*", "g"), params[param]);
	}
	thePath = thePath.replace(/:[^\?]*\?/g, "");
	if(thePath.match(/:/)) {
		throw "Missing required parameter(s): " + thePath;
	}
	thePath = path.join("", thePath);
	return thePath;
};

// ## The *setDefaultMethod* function
exports.setDefaultMethod = function(theMethod) {
	if(theMethod.match(/^(get|post|put|del|all)$/i)) {
		defaultMethod = theMethod.toLowerCase();
	} else {
		throw "Invalid HTTP method name: " + theMethod + ". Should be one of: get, post, put, del, or all.";
	}
};
