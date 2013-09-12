<?php

namespace Samson\Bundle\DataGridBundle\Helper;


use Doctrine\ORM\EntityManager;
use Samson\Bundle\DataGridBundle\Helper\Exception\ValidationException;
use Samson\Bundle\DataViewBundle\DataView\AbstractDataView;
use Symfony\Component\Form\FormFactoryInterface;

class ControllerHelper
{
    private $formFactory;

    private $em;

    private $formOptions;

    public function __construct(FormFactoryInterface $formFactory, EntityManager $em)
    {
        $this->formFactory = $formFactory;
        $this->em = $em;
    }

    public function index(AbstractDataView $view, array $entities)
    {
        $data = array_map(function ($entity) use ($view) {
            $view->serialize($entity);
            return $view->getData();
        }, $entities);

        return $data;
    }

    public function create()
    {
        return call_user_func_array(array($this, 'update'), func_get_args());
    }

    public function update($entity, $formType, array $data, array $formOptions = array())
    {
        $form = $this->formFactory->create($formType, $entity, array_merge(array('csrf_protection' => false), $formOptions));

        if (!$form->submit($data)->isValid()) {
            throw new ValidationException($form);
        }
    }
}