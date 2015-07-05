<?php
namespace geotime\helpers;
use geotime\models\mariadb\CalibrationPoint;
use geotime\models\mariadb\CoordinateLatLng;
use geotime\models\mariadb\CoordinateXY;
use geotime\models\mariadb\ReferencedTerritory;
use geotime\new_models\AbstractEntityHelper;

class ReferencedTerritoryHelper implements AbstractEntityHelper
{
    /**
     * @param $object \stdClass
     * @return ReferencedTerritory
     */
    public static function buildAndSaveFromObject($object)
    {
        $fields = array(
            'name' => 'name',
            'previous' => 'previous',
            'next' => 'next'
        );
        $fieldValues = array();
        foreach ($fields as $mappedField => $optionalField) {
            if (isset($object->$optionalField)) {
                $fieldValues[$mappedField] = $object->$optionalField->value;
            } else {
                $fieldValues[$mappedField] = '';
            }
        }

        return self::buildAndCreate($fieldValues['name'], $fieldValues['previous'], $fieldValues['next']);
    }

    /**
     * @param string $name
     * @param string $previous
     * @param string $next
     * @return ReferencedTerritory
     */
    public static function buildAndCreate($name, $previous = null, $next = null)
    {
        $referencedTerritory = new ReferencedTerritory($name);
        if (!empty($previous)) {
            $referencedTerritory->setPrevious(self::referencedTerritoriesStringToTerritoryArray($previous));
        }
        if (!empty($next)) {
            $referencedTerritory->setNext(self::referencedTerritoriesStringToTerritoryArray($next));
        }
        $calibrationPoint = new CalibrationPoint(new CoordinateLatLng(1, 2), new CoordinateXY(3, 4));
        $referencedTerritory->setCalibrationPoint($calibrationPoint);

        ModelHelper::getEm()->persist($referencedTerritory);
        ModelHelper::getEm()->flush();
        return $referencedTerritory;
    }

    /**
     * @param $territoriesString string
     * @return ReferencedTerritory[]
     */
    public static function referencedTerritoriesStringToTerritoryArray($territoriesString)
    {
        return array_map(
            function ($referencedTerritoryName) {
                $referencedTerritory = self::findOneByName($referencedTerritoryName);
                if (is_null($referencedTerritory) && !empty($referencedTerritoryName)) {
                    $referencedTerritory = self::buildAndCreate($referencedTerritoryName);
                }
                return $referencedTerritory;
            },
            explode('|', $territoriesString)
        );
    }

    /**
     * @param $name
     * @return ReferencedTerritory|object
     */
    public static function findOneByName($name) {
        return ModelHelper::getEm()->getRepository(ReferencedTerritory::CLASSNAME)
            ->findOneBy(array('name' => $name));
    }

    /**
     * @return int
     */
    public static function count() {
        $qb = ModelHelper::getEm()->createQueryBuilder();
        $qb->select('count(referencedTerritory.id)');
        $qb->from(ReferencedTerritory::CLASSNAME,'referencedTerritory');

        return $qb->getQuery()->getSingleScalarResult();
    }

    // @codeCoverageIgnoreStart
    static final function getTableName()
    {
        return ModelHelper::getEm()->getClassMetadata(ReferencedTerritory::CLASSNAME)->getTableName();
    }
    // @codeCoverageIgnoreEnd
}