exports.test = function(request, response, next) {
	response.end('test');
};

exports.intercept = function(request, response, next) {
	response.end('intercept');
};

exports.donotintercept = function(request, response, next) {
	next();
};
