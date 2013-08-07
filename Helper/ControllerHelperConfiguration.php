<?php

namespace Samson\Bundle\DataGridBundle\Helper;

use Samson\Bundle\DataViewBundle\DataView\AbstractDataView;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Symfony\Component\OptionsResolver\OptionsResolverInterface;

class ControllerHelperConfiguration
{
    private $view;
    private $formType;
    private $options;

    public function __construct(AbstractDataView $view, $formType, array $options = array())
    {
        $this->formType = $formType;
        $this->view = $view;

        $resolver = new OptionsResolver();
        $this->setDefaultOptions($resolver);
        $this->options = $resolver->resolve($options);
    }

    public function getFormType()
    {
        return $this->formType;
    }

    public function getView()
    {
        return $this->view;
    }

    public function getOptions()
    {
        return $this->options;
    }

    public function setDefaultOptions(OptionsResolverInterface $resolver)
    {
        $resolver->setDefaults(array(
        ));
    }

}