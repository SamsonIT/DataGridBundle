<?php

namespace Samson\Bundle\DataGridBundle\Helper;


use Doctrine\ORM\EntityManager;
use Samson\Bundle\DataGridBundle\Helper\Exception\ValidationException;
use Samson\Bundle\DataViewBundle\DataView\AbstractDataView;
use Symfony\Component\Form\FormFactoryInterface;

class ControllerHelper
{

    const DATAGRID_VERSION = 2;

    private $formFactory;
    private $viewFactory;
    private $em;

    private $formOptions;

    /**
     * @param FormFactoryInterface $formFactory factory for creating the form
     * @param FormFactoryInterface $viewFactory factory for creating the view
     * @param EntityManager $em
     */
    public function __construct(FormFactoryInterface $formFactory, FormFactoryInterface $viewFactory, EntityManager $em)
    {
        $this->formFactory = $formFactory;
        $this->viewFactory = $viewFactory;
        $this->em = $em;
    }

    public function index($viewType, array $entities)
    {
        $viewFactory = $this->viewFactory;
        $data = array_map(function ($entity) use ($viewType, $viewFactory) {
            $view = $viewFactory->create($viewType, $entity)->createView();
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