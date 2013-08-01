<?php

namespace Samson\Bundle\DataGridBundle\Helper\Exception;

class ValidationException extends \InvalidArgumentException
{
    private $form;

    public function __construct($form)
    {
        $this->form = $form;
        parent::__construct('Validation errors occurred');
    }

    public function getForm()
    {
        return $this->form;
    }

}