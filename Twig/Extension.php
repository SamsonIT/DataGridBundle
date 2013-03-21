<?php

namespace Samson\Bundle\DataGridBundle\Twig;

use Twig_Extension;
use Twig_Function_Method;

class Extension extends Twig_Extension
{
    private $defaults;

    private $environment;

    public function __construct(array $defaults)
    {
        $this->defaults = $defaults;
    }

    public function initRuntime(\Twig_Environment $environment)
    {
        $this->environment = $environment;
    }

    public function getName()
    {
        return 'samson_data_grid';
    }

    public function getFunctions()
    {
        return array(
            'initializeDataGrid' => new Twig_Function_Method($this, 'initialize', array('is_safe' => array('html'))),
        );
    }

    public function initialize()
    {
        return $this->environment->render('SamsonDataGridBundle:DataGrid:initialize.html.twig', array('defaults' => $this->defaults));
    }
}