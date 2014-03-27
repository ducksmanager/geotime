<?php

namespace geotime\models;

use Purekid\Mongodm\Model;
use Logger;

Logger::configure("lib/geotime/logger.xml");


class Map extends Model {
    static $collection = "maps";

    /** @var \Logger */
    static $log;

    protected static $attrs = array(
        'fileName' => array('type' => 'string'),
        'uploadDate' => array('type' => 'date'),
        'territories' => array('model' => 'geotime\models\Territory', 'type' => 'references')
    );

    /**
     * @return string
     */
    public function getFileName() {
        return $this->__getter('fileName');
    }

    /**
     * @param string $fileName
     */
    public function setFileName($fileName) {
        $this->__setter('fileName', $fileName);
    }

    /**
     * @return \MongoDate
     */
    public function getUploadDate() {
        return $this->__getter('uploadDate');
    }

    /**
     * @param \MongoDate $uploadDate
     */
    public function setUploadDate($uploadDate) {
        $this->__setter('uploadDate', $uploadDate);
    }

    /**
     * @return Territory[]
     */
    public function getTerritories() {
        return $this->__getter('territories');
    }

    /**
     * @param Territory[] $territories
     */
    public function setTerritories($territories) {
        $this->__setter('territories', $territories);
    }

    /**
     * @param $imageMapFullName
     * @param $startDateStr
     * @param $endDateStr
     * @return Map
     */
    public static function generateAndSaveReferences($imageMapFullName, $startDateStr, $endDateStr)
    {
        self::$log->debug('Generating references for map '.$imageMapFullName);

        $period = Period::generate($startDateStr, $endDateStr);
        $period->save();

        $territory = new Territory();
        $territory->setPeriod($period);
        $territory->save();

        $map = new Map();
        $map->setFileName($imageMapFullName);
        $map->setTerritories(array($territory));

        return $map;
    }

    public function deleteReferences() {
        self::$log->debug('Deleting references of map '.$this->getFileName());

        foreach($this->getTerritories() as $territory) {
            $territory->getPeriod()->delete();
            $territory->delete();
        }
    }
}

Map::$log = Logger::getLogger("main");