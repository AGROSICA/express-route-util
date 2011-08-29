var express = require('express');
var routing = require('../express-route-util');
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
	},
	'test getControllerUrl valid request': function() {
		var server = express.createServer();
		routing.registerRoutes(server, { '/test/:testVar': 'test' }, './controllers');
		assert.strictEqual('/test/12', routing.getControllerUrl('test', { testVar: 12 }));
	},
	'test DepthString default values': function() {
		var testDepthString = new routing.DepthString();
		assert.strictEqual("", testDepthString.toString());
		assert.strictEqual(Infinity, testDepthString.depth);
	},
	'test DepthString construction': function() {
		var testDepthString1 = new routing.DepthString(5, "str");
		var testDepthString2 = new routing.DepthString("str", 5);
		assert.strictEqual(testDepthString1.toString(), testDepthString2.toString());
		assert.strictEqual(testDepthString1.depth, testDepthString2.depth);
		assert.strictEqual(testDepthString1.toString(), "str");
		assert.strictEqual(testDepthString2.depth, 5);
	},
	'test basic routing': function() {
		var server = express.createServer();
		routing.registerRoutes(server, { 'get,post/test': 'test' }, './controllers');
		assert.response(server, { url: '/test', method: 'GET'}, { body: 'test' });
		assert.response(server, { url: '/test', method: 'POST'}, { body: 'test' });
	},
	'test route array': function() {
		var server = express.createServer();
		routing.registerRoutes(server, {
			'/test1': ['intercept', 'test'],
			'/test2': ['donotintercept', 'test']
		}, './controllers');
		assert.response(server, { url: '/test1' }, { body: 'intercept' });
		assert.response(server, { url: '/test2' }, { body: 'test' });
	},
	'test depth routing': function() {
		var server = express.createServer();
		routing.registerRoutes(server, {
			'/test': {
				'/depth': 'depth.test'
			}
		}, './controllers');
		assert.response(server, { url: '/test/depth' }, { body: 'depth test' });
	},
	'test required controllers': function() {
		var server = express.createServer();
		routing.registerRoutes(server, {
			'/prefix': {
				'required': {
					'prefix': 'intercept'
				},
				'/test': 'test',
				'/depth': {
					'/test': 'test'
				}
			},
			'/postfix': {
				'required': {
					'postfix': 'intercept'
				},
				'/test': 'test',
				'/donotintercept': 'donotintercept'
			},
			'/nodepth': {
				'required': {
					'prefix': 'intercept',
					'depth': 0
				},
				'/test': 'test',
				'/depth': {
					'/test': 'test'
				}
			},
			'/complexdepth': {
				'required': {
					'prefix': [routing.DepthString('test', 0), 'intercept']
				},
				'/test': 'donotintercept',
				'/depth': {
					'/test': 'donotintercept'
				}
			}
		}, './controllers');
		assert.response(server, { url: '/prefix/test' }, { body: 'intercept' }, '1');
		assert.response(server, { url: '/prefix/depth/test' }, { body: 'intercept' }, '2');
		assert.response(server, { url: '/postfix/test' }, { body: 'test' }, '3');
		assert.response(server, { url: '/postfix/donotintercept' }, { body: 'intercept' }, '4');
		assert.response(server, { url: '/nodepth/test' }, { body: 'intercept' }, '5');
		assert.response(server, { url: '/nodepth/depth/test' }, { body: 'test' }, '6');
		assert.response(server, { url: '/complexdepth/test' }, { body: 'test' }, '7');
		assert.response(server, { url: '/complexdepth/depth/test'}, { body: 'intercept' }, '8');
	}
};
