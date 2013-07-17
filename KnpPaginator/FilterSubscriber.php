<?php

namespace Samson\Bundle\DataGridBundle\KnpPaginator;

use Doctrine\ORM\QueryBuilder;
use Knp\Component\Pager\Event\AfterEvent;
use Knp\Component\Pager\Event\ItemsEvent;
use Samson\Bundle\AutocompleteBundle\Query\ResultsFetcher;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Request;

class FilterSubscriber implements EventSubscriberInterface
{
    private $fetcher;
    private $request;

    public function __construct(ResultsFetcher $fetcher)
    {
        $this->fetcher = $fetcher;
    }

    public function setRequest(Request $request = null)
    {
        $this->request = $request;
    }

    public function items(ItemsEvent $event)
    {
        $qb = $event->target;

        if ($event->target instanceof QueryBuilder) {
            if ($this->request->query->has($event->options['filterFieldParameterName'])
                && $this->request->query->has($event->options['filterValueParameterName'])
            ) {
                $fields = (array) $_GET[$event->options['filterFieldParameterName']];
                $values = (array) $_GET[$event->options['filterValueParameterName']];

                $this->fetcher->getResultsByArray($values, $qb, $fields);
            }
        }
    }

    public static function getSubscribedEvents()
    {
        return array(
            'knp_pager.items' => array('items', 11),
        );
    }
}