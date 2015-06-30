var page = require('webpage').create(),
	system = require('system'),
	server = require('webserver').create(),
	fs = require('fs'),
	svgPath;

if (system.args.length < 7) {
	console.error('Invalid arguments');
	phantom.exit(1);
} else {
	svgPath = fs.workingDirectory + '/' + system.args[1];
	if (!fs.isFile(svgPath)) {
		console.log(svgPath + ' does not exist');
		phantom.exit(1);
	}
	var serverCreated = server.listen('127.0.0.1:8888', function (request, response) {
		var cleanedUrl = request.url
			.replace(/\//g, fs.separator)
			.replace(/\?.*$/g, '');
		//console.log('Requesting ' + request.url + ', loading ' + cleanedUrl);
		var pagePath = fs.workingDirectory.replace(/\//g, fs.separator) + cleanedUrl;
		response.statusCode = 200;
		try {
			response.write(fs.read(pagePath));
		} catch(err) {
			console.error('Error while reading ' + cleanedUrl + '(requested URL : '+request.url+')');
			response.close();
			phantom.exit(1);
		}
		response.close();

	});

	if (!serverCreated) {
		console.error('Error while creating HTTP server');
		phantom.exit(1);
	}

	page.open('http://127.0.0.1:8888/index_headless.html', function () {
		setTimeout(function () {
			var pathCoordinates = page.evaluate(function (args, svgContent) {
				var d3 = window.d3;

				getSelectedProjection = function () {
					return projectionName;
				};

				initMapArea();

				var svgFileName = args[1];
				var pathId = args[2];
				var projectionName = args[3];
				var projectionCenter = args[4].split(',').map(function (value) {
					return parseInt(value);
				});
				var projectionScale = parseInt(args[5]);
				var projectionRotation = args[6].split(',').map(function (value) {
					return parseInt(value);
				});

				projection = d3.geo[projectionName]()
					.center(projectionCenter)
					.scale(projectionScale)
					.rotate(projectionRotation)
					.precision(.01);

				return loadTerritoryMap(svgFileName, {
					id: 'externalSvg',
					projection: projectionName,
					center: projectionCenter,
					scale: projectionScale,
					rotation: projectionRotation
				}, svgContent, function () {
					return d3.select('svg path#' + pathId).getPathCoordinates();
				});
			}, system.args, fs.read(svgPath));

			console.log(JSON.stringify(pathCoordinates));
			server.close();
			phantom.exit(0);
		}, 500);
	});
}