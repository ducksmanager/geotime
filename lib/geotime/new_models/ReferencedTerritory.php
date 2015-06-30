<?php
namespace geotime\models\mariadb;

use Doctrine\ORM\Mapping\Column;
use Doctrine\ORM\Mapping\Entity;
use Doctrine\ORM\Mapping\Id;
use Doctrine\ORM\Mapping\JoinTable;
use Doctrine\ORM\Mapping\ManyToMany;

/**
 * @Entity @Table(name="referencedTerritories")
 **/
class ReferencedTerritory
{

    /** @Id @Column(type="integer") @GeneratedValue *
     * @Column(type="integer")
     */
    var $id;

    /** @Column(type="string") **/
    var $name;

    /**
     * @ManyToMany(targetEntity="ReferencedTerritory")
     * @JoinTable(name="previous_referenced_territories")
     */
    var $previous;

    /**
     * @ManyToMany(targetEntity="ReferencedTerritory")
     * @JoinTable(name="next_referenced_territories")
     */
    var $next;

    /**
     * ReferencedTerritory constructor.
     * @param $name
     * @param $previous
     * @param $next
     */
    public function __construct($name, $previous = array(), $next = array())
    {
        $this->name = $name;
        $this->previous = $previous;
        $this->next = $next;
    }

    // @codeCoverageIgnoreStart
    /**
     * @return integer
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * @return string
     */
    public function getName()
    {
        return $this->name;
    }

    /**
     * @param string $name
     */
    public function setName($name)
    {
        $this->name = $name;
    }

    /**
     * @return ReferencedTerritory[]
     */
    public function getPrevious()
    {
        return $this->previous;
    }

    /**
     * @param ReferencedTerritory[] $previous
     */
    public function setPrevious($previous)
    {
        $this->previous = $previous;
    }

    /**
     * @return ReferencedTerritory[]
     */
    public function getNext()
    {
        return $this->next;
    }

    /**
     * @param ReferencedTerritory[] $next
     */
    public function setNext($next)
    {
        $this->next = $next;
    }
    // @codeCoverageIgnoreEnd

}