<?php

namespace Samson\Bundle\DataGridBundle\Helper;

use Samson\Bundle\DataViewBundle\DataView\AbstractDataView;

class ControllerHelperConfiguration
{
    private $view;
    private $formType;

    public function __construct(AbstractDataView $view, $formType)
    {
        $this->formType = $formType;
        $this->view = $view;
    }

    public function getFormType()
    {
        return $this->formType;
    }

    public function getView()
    {
        return $this->view;
    }

}