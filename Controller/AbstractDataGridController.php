<?php

namespace Samson\Bundle\DataGridBundle\Controller;

use Samson\Bundle\DataGridBundle\Helper\ControllerHelperConfiguration;
use Samson\Bundle\DataGridBundle\Helper\Exception\ValidationException;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

abstract class AbstractDataGridController extends Controller
{

    /**
     * @return ControllerHelperConfiguration
     */
    abstract protected function getHelperConfiguration();

    protected function getHelper()
    {
        return $this->get('samson_datagrid.controller_helper');
    }

    protected function getList($entities)
    {
        return $this->getHelper()->index($this->getHelperConfiguration()->getViewType(), $entities);
    }

    protected function handleEdit($entity)
    {

        $em = $this->getDoctrine()->getManager();

        $options = $this->getHelperConfiguration()->getOptions();
        try {
            $this->getHelper()->update($entity, $this->getHelperConfiguration()->getFormType(), json_decode($this->getRequest()->getContent(), true), $options['form_options']);
        } catch (ValidationException $e) {
            $result = new Response($this->get('jms_serializer')->serialize($e->getForm(), 'json'), 400);
            $result->headers->add(array('Content-Type' => 'application/json'));
            return $result;
        }

        $em->persist($entity);
        $em->flush();
        $view = $this->get('samson.dataview.factory')->create($this->getHelperConfiguration()->getViewType(), $entity)->createView();
        return new Response($this->get('jms_serializer')->serialize($view->getData(), 'json'));
    }

    protected function handleCreate()
    {
        $em = $this->getDoctrine()->getManager();
        return call_user_func_array(array($this, 'handleEdit'), func_get_args());
    }

    protected function handleDelete($entity)
    {
        $em = $this->getDoctrine()->getManager();
        $em->remove($entity);
        $em->flush();

        return new Response('');
    }
}