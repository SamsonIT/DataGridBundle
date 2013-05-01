<?php

namespace Samson\Bundle\DataGridBundle\Twig;

class TwigExtension extends \Twig_Extension
{

    public function getName()
    {
        return 'datagrid_twig_extension';
    }

    public function getFilters()
    {
        return array(
            new \Twig_SimpleFilter('underscore', function($value) {
                    return preg_replace_callback('/(?<!^)[A-Z]/', function($m) {
                            return sprintf('_%s', strtolower($m[0]));
                        }, $value);
                })
        );
    }
}
