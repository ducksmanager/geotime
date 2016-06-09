var widthSuperimposed = 960;
var widthSideBySide = 480;

var width = widthSuperimposed;

var mapHeight= 480;
var svg;
var markersSvg = d3.selectAll('nothing');

var projections = [
	'mercator',
	'equirectangular',
	'orthographic'
];

var projectionSelection = d3.selectAll('nothing');

var projection,
	path;


function applyProjection(name, center, scale, rotation) {
	projection = d3.geo[name]()
		.center(center || [0, 0])
		.scale(scale || width / 2 / Math.PI)
		.rotate(rotation || (projection ? projection.rotate() : [0, 0, 0]))
		.precision(.01);

	if (svg) {
		applyCurrentProjection();
	}
}

function applyCurrentProjection() {
	var scope = angular.element('#dragActionContainer').scope();

	scope.path.projection(projection);
	scope.zoom.scale(projection.scale());

	drawPaths(scope.path);
}

function drawPaths(path) {
	svg.selectAll('path.subunit').attr("d", path);
	d3.select('#projectionCenter').text(projection.center().map(function(val) { return parseInt(val*10)/10; }));
	d3.select('#projectionRotation').text(projection.rotate().map(function(val) { return parseInt(val*10)/10; }));

	var scope = angular.element('#calibrationPoints').scope();
	markersSvg.repositionCalibrationMarkers(scope && scope.calibrationPoints || [], 'bgPoint');
}
function initMapPlaceHolders(callback) {
	$('#map-placeholders').load('map-placeholders.html', {}, callback);
}

function initBackgroundMap() {
	svg = d3.select("#mapArea #map")
		.datum({x: 0, y: 0});
}

function getSelectedProjection() {
	return (projectionSelection.size() > 0)
		? d3.select(projectionSelection.node().options[projectionSelection.node().selectedIndex]).datum().name
		: 'mercator';
}

function displaySelectedProjection(projectionName) {
	projectionSelection.selectAll('option')
		.attr('selected', function(d) { return d.name === projectionName ? 'selected' : null});
}

function showBgMap(id, data, error) {
	if (error) {
		console.error(error);
	}
	else {
		svg.select("g#" + id)
			.selectAll(".subunit")
			.data(data.geometries)
			.enter()
				.append("path")
				.attr("class", "subunit-boundary subunit");

		applyProjection(getSelectedProjection());
	}
}

function getAndShowBgMap(id, filePath, callback) {
	callback = callback || function() {};
	d3.json(filePath, function(error, world) {
		showBgMap(id, world);
		callback();
	});
}

var svgMap = null;
var isLoading = false;

function initExternalSvgMap() {
	$('#externalSvg').remove();
	if (svgMap) {
		svgMap = null;
	}
	isLoading = false;
}

function loadTerritoryMapFromSvgElement(mapInfo) {
	svgMap
		.attr("name", mapInfo.fileName)
		.attr("id", "externalSvg")
		.classed("externalSvg", true)
		.attr("preserveAspectRatio", "xMinYMin meet");

	svgMap
		.datum({
			id: mapInfo.id,
			fileName: mapInfo.fileName,
			x: 0,
			y: 0
		});
}

function loadUIConfig(mapInfo) {
	svgMap.datum(mapInfo);

	if (mapInfo.projection) {
		applyProjection(mapInfo.projection, mapInfo.center, mapInfo.scale, mapInfo.rotation);
		displaySelectedProjection(mapInfo.projection);
	}
	else {
		applyProjection('mercator', 0, 0, [0, 0, 0]);
	}
}

function validateMapLocation(mapData) {
    ajaxPost(
        {
            locateMap: 1,
            mapId: mapData.id,
            mapProjection: mapData.projection,
            mapRotation: mapData.rotation,
            mapCenter: mapData.center,
            mapScale: mapData.scale,
            calibrationPoints: mapData.calibrationPoints
        },
        function(error) {
            if (error) {
                alert(error);
            }
			else {
				alert('Done');
			}
        }
    );
}

function validateTerritories(mapId, territoriesData) {
	ajaxPost(
		{
			addTerritories: 1,
			mapId: mapId,
			territories: territoriesData
        },
		function(error) {
			if (error) {
				alert(error);
			}
			else {
				alert('Done');
			}
		}
	);
}

d3.selection.prototype.mapOffset = function() {
	return {
		x: this.styleIntWithoutPx("margin-left"),
		y: this.styleIntWithoutPx("margin-top")
	};
};