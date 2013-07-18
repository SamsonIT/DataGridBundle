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
                $fields = $this->assertArray($_GET[$event->options['filterFieldParameterName']], ",");
                $values = $this->assertArray($_GET[$event->options['filterValueParameterName']], "/\s+/");

                $this->fetcher->getResultsByArray($values, $qb, $fields);
            }
        }
    }

    private function assertArray($value, $separator)
    {
        if (is_array($value)) {
            return $value;
        }

        if ($separator[0] == '/') {
            return preg_split($separator, $value);
        } else {
            return explode($separator, $value);
        }
    }

    public static function getSubscribedEvents()
    {
        return array(
            'knp_pager.items' => array('items', 11),
        );
    }
}