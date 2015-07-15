<?php
namespace geotime\helpers;
use geotime\models\mariadb\Map;
use geotime\models\mariadb\Territory;

use Logger;

Logger::configure("lib/geotime/logger.xml");

class MapHelper implements AbstractEntityHelper
{
    /** @var \Logger */
    static $log;

    /**
     * @param $imageMapFullName
     * @param $startDateStr
     * @param $endDateStr
     * @return Map
     */
    public static function generateAndSaveReferences($imageMapFullName, $startDateStr, $endDateStr)
    {
        self::$log->debug('Generating references for map '.$imageMapFullName);

        $territory = new Territory(null, true, new \stdClass(), 0, '', new \DateTime($startDateStr), new \DateTime($endDateStr));

        ModelHelper::getEm()->persist($territory);
        ModelHelper::getEm()->flush();

        $map = new Map();
        $map->setFileName($imageMapFullName);
        $map->setTerritories(array($territory));

        return $map;
    }

    /**
     * @param $map Map
     * @param $territory Territory
     */
    public static function addTerritory($map, $territory) {
        $map->addTerritory($territory);
    }

    /**
     * @param $map Map
     */
    public static function deleteTerritories($map) {
        self::$log->debug('Deleting territories from map '.$map->getFileName());

        foreach($map->getTerritories() as $territory) {
            ModelHelper::getEm()->remove($territory);
        }
        ModelHelper::getEm()->flush();
    }

    /**
     * @return Map[]
     */
    public static function findAll()
    {
        return ModelHelper::getEm()->getRepository(Map::CLASSNAME)
            ->findAll();
    }

    /**
     * @return object
     */
    public function __toSimplifiedObject() {
        // TODO
        /*
        $territories = $this->getTerritories();
        $simplifiedTerritories = array();
        foreach($territories as $territory) {
            $territory->loadReferencedTerritory();
            $simplifiedTerritories[] = $territory->__toSimplifiedObject(true);
        }

        $simplifiedMap = parent::__toSimplifiedObject();
        $simplifiedMap->territories = $simplifiedTerritories;

        return $simplifiedMap;
        */
    }

    /**
     * @param $mapId int
     * @return null|Map
     */
    public static function find($mapId) {
        return ModelHelper::getEm()->getRepository(Map::CLASSNAME)
            ->find($mapId);
    }

    /**
     * @param $fileName
     * @return Map|object
     */
    public static function findOneByFileName($fileName) {
        return ModelHelper::getEm()->getRepository(Map::CLASSNAME)
            ->findOneBy(array('fileName' => $fileName));
    }

    /**
     * @param $mapId int
     */
    public static function delete($mapId) {
        $map = self::find($mapId);
        ModelHelper::getEm()->remove($map);
        ModelHelper::getEm()->flush();
    }

    /**
     * @return int
     */
    public static function count() {
        $qb = ModelHelper::getEm()->createQueryBuilder();
        $qb->select('count(map.id)');
        $qb->from(Map::CLASSNAME,'map');

        return $qb->getQuery()->getSingleScalarResult();
    }

    // @codeCoverageIgnoreStart
    static final function getTableName()
    {
        return ModelHelper::getEm()->getClassMetadata(Map::CLASSNAME)->getTableName();
    }
    // @codeCoverageIgnoreEnd
}

MapHelper::$log = Logger::getLogger("main");