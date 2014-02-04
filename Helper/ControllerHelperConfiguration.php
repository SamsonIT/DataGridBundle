<?php

namespace Samson\Bundle\DataGridBundle\Helper;

use Samson\Bundle\DataViewBundle\DataView\AbstractDataView;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\OptionsResolver\OptionsResolverInterface;

class ControllerHelperConfiguration
{
    private $viewType;
    private $formType;
    private $options;

    public function __construct($viewType, $formType, array $options = array())
    {
        $this->formType = $formType;
        $this->viewType = $viewType;

        $resolver = new OptionsResolver();
        $this->setDefaultOptions($resolver);
        $this->options = $resolver->resolve($options);
    }

    public function getFormType()
    {
        return $this->formType;
    }

    public function getViewType()
    {
        return $this->viewType;
    }

    public function getOptions()
    {
        return $this->options;
    }

    public function setDefaultOptions(OptionsResolverInterface $resolver)
    {
        $resolver->setDefaults(array(
            'form_options' => array()
        ));
    }

}