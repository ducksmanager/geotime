var calibrationPoints = [];

function getMarkers() {
    var group = markersSvg.selectAll('g.marker-group').filter(function(d) { return d.type === 'bgMap'; });
    return group.selectAll('use');
}


// Calibrate the background's center, scale and rotation so that the two maps are superimposed
function calibrateMapScale(min, max, inc) {
    min = min || 100;
    max = max || 5000;
    inc = inc || 200;
    var bestScale = {scale: null, ratio: Infinity};

    var markers = getMarkers();

    var newRatio;
    for (var newScale = min; newScale <= max; newScale += inc) {
        projection.scale(newScale);
        markers.each(positionCalibrationMarker);
        newRatio = getCalibrationPointsDistanceDiffsValue().bgFgDistanceRatio;
        console.log('Calibrating with scale = '+newScale+', ratio = ' + newRatio);
        if (Math.abs(newRatio - 1) < Math.abs(bestScale.ratio -1)) {
            bestScale = {scale: newScale, ratio: newRatio};
        }
    }

	console.log('=> Calibrated scale = '+bestScale.scale+', final offset : ' + bestScale.ratio);

	var new_inc = inc / 10;
    if (new_inc >= 2) {
        calibrateMapScale(bestScale.scale - inc/2, bestScale.scale + inc/2, new_inc);
    }
    else {
		applyProjection(getSelectedProjection(), projection.center(), bestScale.scale, projection.rotate());
	}
}

function calibrateMapCenter() {
    var markers = getMarkers();
    var currentCenter = projection.center();

    var externalMapOffsetToCenter = getExternalMapOffsetToCenter();

    function getDirections(bgMapFirstPoint, fgMapFirstPoint) {
        return {
            x: bgMapFirstPoint.x - (fgMapFirstPoint.x + externalMapOffsetToCenter.x) < 0 ? -1:  1,
            y: bgMapFirstPoint.y - (fgMapFirstPoint.y + externalMapOffsetToCenter.y) < 0 ? 1 : -1
        };
    }

	var groupedCalibrationPoints = getGroupedCalibrationPoints();

    var initialDirections = getDirections(groupedCalibrationPoints[0].bgMap, groupedCalibrationPoints[0].fgMap);
    var directions = JSON.parse(JSON.stringify(initialDirections));
    while(initialDirections.x === directions.x || initialDirections.y === directions.y) {
        if (initialDirections.x === directions.x) {
            currentCenter[0]+=directions.x;
        }
        if (initialDirections.y === directions.y) {
            currentCenter[1]+=directions.y;
        }
        projection.center(currentCenter);
        markers.each(positionCalibrationMarker);

        directions = getDirections(groupedCalibrationPoints[0].bgMap, groupedCalibrationPoints[0].fgMap);
    }

	currentCenter[0]+=directions.x;
	currentCenter[1]+=directions.y;

    applyProjection(getSelectedProjection(), currentCenter, projection.scale(), projection.rotate());
}

function getCalibrationPointsDistanceDiffsValue() { // distance diff-based value. Smaller is better
	var pxDistanceSums = {bgMap: 0, fgMap: 0, ratios: [], latitudeRatios: []};
	var groupedCalibrationPoints = getGroupedCalibrationPoints(true);

	groupedCalibrationPoints.forEach(function(point1, i) {
		var bgMapPoint1 = [point1.bgMap.x, point1.bgMap.y];
		var fgMapPoint1 = [point1.fgMap.x, point1.fgMap.y];
		groupedCalibrationPoints.forEach(function(point2, j) {
			if (i < j) {
				var bgMapPoint2 = [point2.bgMap.x, point2.bgMap.y];
				var fgMapPoint2 = [point2.fgMap.x, point2.fgMap.y];
				var bgMapDistance = Math.sqrt(Math.pow(bgMapPoint1[0] - bgMapPoint2[0], 2) + Math.pow(bgMapPoint1[1] - bgMapPoint2[1], 2));
				var fgMapDistance = Math.sqrt(Math.pow(fgMapPoint1[0] - fgMapPoint2[0], 2) + Math.pow(fgMapPoint1[1] - fgMapPoint2[1], 2));
				pxDistanceSums.bgMap += bgMapDistance;
				pxDistanceSums.fgMap += fgMapDistance;
				pxDistanceSums.ratios.push(fgMapDistance / bgMapDistance);
				pxDistanceSums.latitudeRatios.push((Math.abs(fgMapPoint1[1] - fgMapPoint2[1])) / Math.abs(bgMapPoint1[1] - bgMapPoint2[1]));
			}
		});
	});

	return {
        value: d3.deviation(pxDistanceSums.ratios),
		latitudeValue: d3.deviation(pxDistanceSums.latitudeRatios),
        bgFgDistanceRatio: d3.mean(pxDistanceSums.ratios),
        diff: pxDistanceSums.bgMap - pxDistanceSums.fgMap
    };
}

var markerSide = 9;
function addCalibrationDefsMarkers() {
	var markerCircleRadius = markerSide * 2 / 3;

	markersSvg = d3.select("#mapArea")
		.append("svg").attr("id", "markers")
		.attr("height", mapHeight);

	markersSvg.selectAll('g')
		.data([{type: 'bgMap'}, {type: 'fgMap'}])
		.enter()
		.append('g')
		.attr('class', function(d) { return 'marker-group '+d.type; });

	var defs = markersSvg.append('defs');
	var marker = defs.append('svg:g').attr('id','crosshair-marker');

	marker.selectAll('circle')
		.data([{stroke: '#000000', r: markerCircleRadius}, {stroke: 'inherit', r: markerCircleRadius + 1}])
		.enter().append('circle')
		.attr('style', function(d) { return 'stroke:'+d.stroke; })
		.attr('cx', markerSide)
		.attr('cy', markerSide)
		.attr('r', function(d) { return d.r; });

	marker.selectAll('path')
		.data([
			{id: 'up', 	  d: 'M'+[markerSide, markerCircleRadius  ].join(',')+' L'+[markerSide, 0           ].join(',')+' z'},
			{id: 'down',  d: 'M'+[markerSide, markerCircleRadius*2].join(',')+' L'+[markerSide, markerSide*2].join(',')+' z'},
			{id: 'left',  d: 'M'+[markerCircleRadius, markerSide  ].join(',')+' L'+[0, markerSide           ].join(',')+' z'},
			{id: 'right', d: 'M'+[markerCircleRadius*2, markerSide].join(',')+' L'+[markerSide*2, markerSide].join(',')+' z'}
		])
		.enter().append('path')
		.attr('style', 'stroke-width:1')
		.attr('id', function(d) { return d.id; })
		.attr('d', function(d) { return d.d; });
}

function addCalibrationMarker(type, coordinates, showMarkers) {

	var pointId = 0;
	calibrationPoints.forEach(function(calibrationPoint) {
		if (calibrationPoint.type === type && calibrationPoint.pointId >= pointId) {
			pointId = calibrationPoint.pointId + 1;
		}
	});

	calibrationPoints.push({pointId: pointId, type: type, coordinates: coordinates});

	if (showMarkers) {
		markersSvg.repositionCalibrationMarkers(type);
	}
}

d3.selection.prototype.repositionCalibrationMarkers = function(type) {
	var filter = function(d) { return !type || d.type === type; };

	var groups = markersSvg.selectAll('g.marker-group').filter(filter);
	groups.each(function(groupData) {
		var groupCalibrationPoints = d3.select(this).selectAll('use')
			.data(calibrationPoints.filter(function(d) { return d.type === groupData.type; }));

		groupCalibrationPoints
			.exit().remove();

		groupCalibrationPoints
			.enter().append('use')
			.filter(filter)
			.attr('xlink:href', '#crosshair-marker');

		groupCalibrationPoints
			.each(positionCalibrationMarker);
	});

	return this;
};

function getGroupedCalibrationPoints(withProjectedCoords) {
	var shownCalibrationPoints = {};
	calibrationPoints.forEach(function(d) {
		if (!(shownCalibrationPoints[d.pointId])) {
			shownCalibrationPoints[d.pointId] = {
				pointId: d.pointId
			};
		}
		shownCalibrationPoints[d.pointId][d.type] = d.coordinates;
		if (d.type === 'bgMap' && !withProjectedCoords) {
			delete shownCalibrationPoints[d.pointId][d.type].x;
			delete shownCalibrationPoints[d.pointId][d.type].y;
		}
	});

	return d3.values(shownCalibrationPoints);
}

function positionCalibrationMarker(d) {
	if (d.coordinates.lng !== undefined) {
		var xyCoordinates = projection([d.coordinates.lng, d.coordinates.lat]);
		d.coordinates.x = xyCoordinates[0].round10pow(6);
		d.coordinates.y = xyCoordinates[1].round10pow(6);
	}

	if (d.type === 'bgMap') {
		d.coordinates.x -= markerSide;
		d.coordinates.y -= markerSide;
	}

	d3.select(this)
		.attr("x", d.coordinates.x)
		.attr("y", d.coordinates.y);
}

function calibrateMapRotationForProjection(projectionName, axisDefaults) {
	var incdeg,
        axisCheckRange,
        isPrecise = !!axisDefaults;

    if (axisDefaults) {
        incdeg = .5;
        axisCheckRange = 5;
    }
    else {
        incdeg = 5;
        axisCheckRange = 89;
        axisDefaults = [0,0,0];
    }

    var markers = getMarkers();

	var min = Infinity;
	var best = null;
	for (var i = axisDefaults[0] - axisCheckRange; i <= axisDefaults[0] + axisCheckRange; i += incdeg) {
		//console.log('Test axis 0 : '+i+'deg at '+new Date().toISOString());
		for (var j = axisDefaults[1] - axisCheckRange; j <= axisDefaults[1] + axisCheckRange; j += incdeg) {
			projection.rotate([i,j,0]);
			markers.each(positionCalibrationMarker);
			var value = getCalibrationPointsDistanceDiffsValue().value;
			if (value < min) {
				min = value;
				best = [i,j,0];
			}
		}
	}

	console.log('Best : '+best+' with '+min);

	min = Infinity;
	for (var k = axisDefaults[2] - axisCheckRange; k <= axisDefaults[2] + axisCheckRange; k += incdeg) {
		projection.rotate([best[0],best[1],k]);
		markers.each(positionCalibrationMarker);
		var latitudeValue = getCalibrationPointsDistanceDiffsValue().latitudeValue;
		if (latitudeValue < min) {
			min = latitudeValue;
			best[2] = k;
		}
	}

	console.log(new Date().toISOString());
	console.log('Best : '+best+' with '+min);

    if (isPrecise) {
		return { projection: projectionName, min: min, rotation: best };
    }
	else {
        return calibrateMapRotationForProjection(projectionName, best)
    }
}

function calibrateMapRotation() {

	var currentProjection = projection;

	var bestProjectionResult = {min: Infinity};
	projections.forEach(function(projectionName) {

		projection = d3.geo[projectionName]()
			.center(currentProjection.center())
			.scale(currentProjection.scale())
			.rotate(currentProjection.rotate());

		applyCurrentProjection();

		var calibrationResults =  calibrateMapRotationForProjection(projectionName);
		if (calibrationResults.min < bestProjectionResult.min) {
			bestProjectionResult = JSON.parse(JSON.stringify(calibrationResults));
		}
		console.log('Result for projection ' + projectionName + ': '+JSON.stringify(calibrationResults));
	});

	if (bestProjectionResult.projection) {
		applyProjection(bestProjectionResult.projection, projection.center(), projection.scale(), bestProjectionResult.rotation);
	}

	console.log('Best result : '+JSON.stringify(bestProjectionResult));
}