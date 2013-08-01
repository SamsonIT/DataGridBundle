<?php

namespace Samson\Bundle\DataGridBundle\Helper;


use Doctrine\ORM\EntityManager;
use Samson\Bundle\DataGridBundle\Helper\Exception\ValidationException;
use Symfony\Component\Form\FormFactoryInterface;

class ControllerHelper
{
    private $formFactory;

    private $em;

    public function __construct(FormFactoryInterface $formFactory, EntityManager $em)
    {
        $this->formFactory = $formFactory;
        $this->em = $em;
    }

    public function index(ControllerHelperConfiguration $config, array $entities)
    {
        $view = $config->getView();
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

    public function update($entity, $formType, array $data)
    {
        $form = $this->formFactory->create($formType, $entity, array('csrf_protection' => false));

        if (!$form->submit($data)->isValid()) {
            throw new ValidationException($form);
        }
    }
}