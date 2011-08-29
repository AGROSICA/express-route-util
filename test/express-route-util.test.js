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
	}
};
