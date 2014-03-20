<?php

namespace geotime;

use geotime\models\Criteria;
use geotime\models\CriteriaGroup;
use Logger;

Logger::configure(stream_resolve_include_path("logger.xml"));

include_once('Util.php');

class Import {

    /** @var \Purekid\Mongodm\Collection */
    static $criteriaGroups;

    /** @var \Logger */
    static $log;

    static function initCriteriaGroups() {
        if (!isset(self::$criteriaGroups)) {
            self::$criteriaGroups = CriteriaGroup::find();
            self::$log->info(self::$criteriaGroups->count()." criteria groups found");
        }
    }

    function execute() {

        self::initCriteriaGroups();

        /** @var CriteriaGroup $criteriaGroup */
        foreach(self::$criteriaGroups as $criteriaGroup) {
            $criteriaGroupName = $criteriaGroup->getName();
            $query_criteriaGroup_is_cached = array( "criteriaGroup" => $criteriaGroupName );
            $cached_criteria_group = Criteria::find( $query_criteriaGroup_is_cached );

            $fileName = Util::$cache_dir_json . $criteriaGroupName . ".json";

            if ($cached_criteria_group->count() === 0 || !file_exists($fileName)) {

                $imageNames = $this->fetchSvgFilenamesFromCriteriaGroup($criteriaGroup, $fileName);
                $svgUrls = $this->getCommonsURLs($imageNames);

                foreach ($svgUrls as $imageMapFullName => $imageMapUrl) {
                    Util::fetchImage($imageMapUrl, $imageMapFullName);
                }
            }
        }
    }

    function getSparqlQueryResults($criteriaGroup) {

        $parameters = array(
            "default-graph-uri" => "http://dbpedia.org",
            "query" => "PREFIX owl: <http://www.w3.org/2002/07/owl#>
                        PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
                        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
                        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
                        PREFIX dc: <http://purl.org/dc/elements/1.1/>
                        PREFIX : <http://dbpedia.org/resource/>
                        PREFIX dbpedia2: <http://dbpedia.org/property/>
                        PREFIX dbpedia: <http://dbpedia.org/>
                        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                      ".$this->buildSparqlQuery($criteriaGroup),
            "output" => "json"
        );

        return Util::curl_get_contents("http://dbpedia.org/sparql", "POST", $parameters);
    }

    function buildSparqlQuery(CriteriaGroup $criteriaGroup) {
        $criteriaStrings = array();
        foreach($criteriaGroup->getCriteriaList() as $criteria) {
            $criteriaStrings[]= implode(" ", array("?e", $criteria->getKey(), $criteria->getValue()));
        }

        $query = "SELECT * WHERE "
                ."{ "
                .implode(" . ", $criteriaStrings)
                ."} ";

        $sort = $criteriaGroup->getSort();
        if (count($sort) > 0) {
            $query.="ORDER BY ".implode(", ", $sort);
        }

        return $query;
    }

    /**
     * Fetch the image filenames corresponding to a criteria group
     * @param CriteriaGroup $criteriaGroup
     * @param string $fileName
     * @return array
     */
    public function fetchSvgFilenamesFromCriteriaGroup(CriteriaGroup $criteriaGroup, $fileName = null)
    {
        $page = $this->getSparqlQueryResults($criteriaGroup);
        if (!is_null($fileName)) {
            file_put_contents($fileName, $page);
        }
        $pageAsJson = json_decode($page);

        return $this->fetchSvgFilenamesFromSparqlResults($pageAsJson);
    }

    /**
     * Fetch the image filenames from a JSON-formatted SPARQL page
     * @param $pageAsJson
     * @return array
     */
    public function fetchSvgFilenamesFromSparqlResults($pageAsJson)
    {
        $imageNames = array();
        foreach ($pageAsJson->results->bindings as $result) {
            $imageMapFullName = Util::cleanupImageName($result->imageMap->value);

            if (strtolower(Util::getImageExtension($imageMapFullName)) === ".svg") {
                $imageNames[]=$imageMapFullName;
            }
        }

        return $imageNames;
    }

    /**
     * Get the images' Wikimedia Commons URLs
     * @param $imageNames
     * @return array An associative name=>URL array
     */
    public function getCommonsURLs($imageNames) {
        $urls = array();
        foreach($imageNames as $imageName) {
            $imageMapUrl = $this->getCommonsImageURL($imageName);
            $urls[$imageName] = $imageMapUrl;
        }

        return $urls;
    }

    /**
     * Get the Wikimedia Commons URL of an image
     * @param $imageMapFullName
     * @return string|null
     */
    function getCommonsImageURL($imageMapFullName) {
        $xmlFormatedPage = new \SimpleXMLElement($this->getCommonsImageXMLInfo($imageMapFullName));
        if (isset($xmlFormatedPage->error)) {
            $firstLevelChildren = (array) $xmlFormatedPage->children();
            self::$log->error($firstLevelChildren['error']);
            return null;
        }
        else {
            return $xmlFormatedPage->file->urls->file;
        }
    }

    /**
     * Get the informations about a Wikimedia Commons image
     * @param $imageMapFullName
     * @return string
     */
    function getCommonsImageXMLInfo($imageMapFullName) {
        $url = "http://tools.wmflabs.org/magnus-toolserver/commonsapi.php";
        return Util::curl_get_contents($url, "GET", array("image" => $imageMapFullName));
    }
}

Import::$log = Logger::getLogger("main");

?>