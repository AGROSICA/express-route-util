var express = require('express');
var routing = require('../express_route_util');
var assert = require('assert');

module.exports = {
	'test setDefaultMethod': function() {
		assert.throws(function() {
			routing.setDefaultMethod('invalid');
		}, function(err) {
			if(err instanceof Error &&
				err.message == "Invalid HTTP method name 'invalid'. Should be: get, post, put, del, or all.") {
				return true;
			}
			return false;
		});
		assert.doesNotThrow(function() {
			routing.setDefaultMethod('get');
		});
	},
	'test registerRoutes invalid controller location value': function() {
		var server = express.createServer();
		assert.throws(function() {
			routing.registerRoutes(server, {}, 'invalid');
		}, function(err) {
			if(err instanceof Error &&
				err.message == 'Controller Path Invalid') {
				return true;
			}
			return false;
		});
	},
	'test registerRoutes invalid controller location datatype': function() {
		var server = express.createServer();
		assert.throws(function() {
			routing.registerRoutes(server, {}, 54.3);
		}, function(err) {
			if(err instanceof Error &&
				err.message == 'Path must be a string or not included') {
				return true;
			}
			return false;
		});
	},
	'test registerRoutes invalid pathToControllerTree object': function() {
		var server = express.createServer();
		assert.throws(function() {
			routing.registerRoutes(server, {3: function(){}});
		}, function(err) {
			if(err instanceof Error &&
				err.message == 'Invalid Route Definition') {
				return true;
			}
			return false;
		});
	},
	'test registerRoutes invalid Express server': function() {
		assert.throws(function() {
			routing.registerRoutes({}, {});
		}, function(err) {
			if(err instanceof Error &&
				err.message == 'Must be given an Express server') {
				return true;
			}
			return false;
		});
	},
	'test registerRoutes valid construction': function() {
		var server = express.createServer();
		assert.doesNotThrow(function() {
			routing.registerRoutes(server, {
				'/test': 'test'
			}, './controllers');
		});
	},
	'test getControllerUrl missing parameters': function() {
		var server = express.createServer();
		routing.registerRoutes(server, { '/test/:testVar': 'test' }, './controllers');
		assert.throws(function() {
			console.log(routing.getControllerUrl('test'));
		}, function(err) {
			if(err instanceof Error &&
				err.message == "Missing required parameter(s): /test/:testVar") {
				return true;
			}
			return false;
		});
	},
	'test getControllerUrl invalid controller requested': function() {
		var server = express.createServer();
		routing.registerRoutes(server, { '/test/:testVar': 'test' }, './controllers');
		assert.throws(function() {
			console.log(routing.getControllerUrl('controllers.test'));
		}, function(err) {
			if(err instanceof Error &&
				err.message == "Invalid Controller Requested") {
				return true;
			}
			return false;
		});
	}
};
