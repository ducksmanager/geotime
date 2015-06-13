<?php

namespace geotime;

use geotime\models\CalibrationPoint;
use geotime\models\CriteriaGroup;
use geotime\models\Map;
use geotime\models\Period;
use geotime\models\ReferencedTerritory;
use geotime\models\Territory;
use Logger;

Logger::configure("lib/geotime/logger.xml");

include_once('Util.php');

class Geotime {

    /** @var \Logger */
    static $log;

    /**
     * @var int Natural Earth data coverage
     */
    static $optimalCoverage = 145389748;

    /**
     * @param $svgOnly boolean
     * @return array
     */
    static function getMapsAndLocalizedTerritoriesCount($svgOnly) {

        $filters = $svgOnly ? array('fileName' => array('$regex' => '.svg$')) : array();

        return array_reduce(
            Map::find($filters)->toArray(),
            function($result, Map $map) {
                $territories = $map->getTerritories()->toArray();
                $result[$map->getFileName()] = array(
                    'count' => count($territories),
                    'area'  => array_sum(
                        array_map(function (Territory $territory) {
                            return $territory->getArea();
                        }, $territories)
                    )
                );
                return $result;
            }
        );
    }

    /**
     * @param $startingWith
     * @return array|string
     */
    static function getReferencedTerritories($startingWith) {
        if (is_null($startingWith) || strlen($startingWith) === 0) {
            return 'At least the first letter of the territory name must me given.';
        }
        return array_map(
            function(ReferencedTerritory $referencedTerritory) {
                return array('id' => $referencedTerritory->getId()->__toString(), 'name' => $referencedTerritory->getName());
            },
            ReferencedTerritory::find(array('name' => array('$regex' => '^'.$startingWith)), array('name' => 1), array('name'=> 1))->toArray()
        );
    }


    /**
     * @return int
     */
    static function getImportedTerritoriesCount() {
        return Territory::count(array('userMade' => false));
    }

    /**
     * Get the land coverage stored for each period
     *
     * @return array An associative (Period string) => (coverage integer) array
     */
    static function getCoverageInfo() {

        $periodsAndCoverage = Territory::aggregate(
            array(
                array(
                    '$group' => array(
                        '_id' => '$period',
                        'areaSum' => array(
                            '$sum' => '$area'
                        )
                    )
                )
            )
        );

        $formattedPeriodsAndCoverage = array();
        foreach($periodsAndCoverage['result'] as $periodAndCoverage) {
            $periodArray = $periodAndCoverage['_id'];

            if (is_null($periodArray)) { // No period specified <=> Natural earth data
                $period = new Period();
                $period->setStart(new \MongoDate(strtotime(NaturalEarthImporter::$dataDate)));
                $period->setEnd(new \MongoDate(strtotime(NaturalEarthImporter::$dataDate)));
            }
            else {
                $period = new Period($periodArray);
            }
            $coverage = new \stdClass();
            $coverage->start = $period->getStartYear();
            $coverage->end = $period->getEndYear();
            $coverage->coverage = $periodAndCoverage['areaSum'];

            $formattedPeriodsAndCoverage[] = $coverage;
        }

        return array('periodsAndCoverage' => $formattedPeriodsAndCoverage, 'optimalCoverage' => self::$optimalCoverage);

    }

    /**
     * @return object|null
     */
    public static function getIncompleteMapInfo()
    {
        /** @var Map $incompleteMap */
        $incompleteMap = Map::one(array('uploadDate'=>array('$exists' => true)));
        if (!is_null($incompleteMap)) {
            $incompleteMap->loadTerritories();
            return $incompleteMap->__toSimplifiedObject();
        }

        return null;
    }

    /**
     * @param $mapId
     * @param $mapProjection string|null
     * @param $mapRotation float[]|null
     * @param $mapCenter string[]|null
     * @param $mapScale int|null
     * @param $calibrationPoints string[]
     * @return Map|null
     */
    public static function updateMap($mapId, $mapProjection = null, $mapRotation = null, $mapCenter = null, $mapScale = null, $calibrationPoints = null) {
        /** @var Map $map */
        $map = Map::one(array('_id' => new \MongoId($mapId)));
        if (is_null($map)) {
            return null;
        }
        else {
            if (!empty($mapProjection)) {
                $map->setProjection($mapProjection);
            }
            if (!empty($mapRotation)) {
                array_walk_recursive($mapRotation, function (&$item) {
                    $item = floatval($item);
                });
                $map->setRotation($mapRotation);
            }
            if (!empty($mapCenter)) {
                array_walk_recursive($mapCenter, function (&$item) {
                    $item = floatval($item);
                });
                $map->setCenter($mapCenter);
            }
            if (!empty($mapScale)) {
                $map->setScale($mapScale);
            }
            if (!empty($calibrationPoints)) {
                array_walk($calibrationPoints, function (&$calibrationPoint) {
                    $calibrationPoint = CalibrationPoint::generateFromStrings(json_decode(json_encode($calibrationPoint)));
                });
                $map->setCalibrationPoints($calibrationPoints);
            }
            if (!empty($mapProjection) && !empty($mapCenter) && !empty($mapScale)) {
                $map->save();
            }
            return $map;
        }
    }

    /**
     * @param $mapId string
     * @param $territoryId string
     * @param $coordinates string
     * @param $xpath string
     * @param $territoryPeriodStart string
     * @param $territoryPeriodEnd string
     * @return mixed|null
     */
    public static function saveLocatedTerritory($mapId, $territoryId, $coordinates, $xpath, $territoryPeriodStart, $territoryPeriodEnd)
    {
        /** @var Map $map */
        $map = Map::one(array('_id' => new \MongoId($mapId)));
        if (is_null($map)) {
            return null;
        }

        /** @var ReferencedTerritory $referencedTerritory */
        $referencedTerritory = ReferencedTerritory::one(array('_id' => new \MongoId($territoryId)));
        if (is_null($referencedTerritory)) {
            return null;
        }

        $territory = Territory::buildAndCreateWithReferencedTerritory($referencedTerritory, true, $territoryPeriodStart, $territoryPeriodEnd, $coordinates, $xpath);
        $map->addTerritory($territory);
        $map->save();
        return $coordinates;
    }

    public static function getCriteriaGroupsNumber() {
        return CriteriaGroup::count();
    }

    /**
     * Removes maps, territories and periods from the DB
     * @param bool $keepMaps
     */
    public static function clean($keepMaps=false) {
        if (!$keepMaps) {
            Map::drop();
        }
        Territory::drop();
        ReferencedTerritory::drop();
        Period::drop();
    }
}

Geotime::$log = Logger::getLogger("main");

?>