<?php

namespace Samson\Bundle\DataGridBundle\Controller;

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

    private function getHelper()
    {
        return $this->get('samson_datagrid.controller_helper');
    }

    protected function getList($entities)
    {
        return $this->getHelper()->index($this->getHelperConfiguration(), $entities);
    }

    protected function handleEdit($entity)
    {

        $em = $this->getDoctrine()->getManager();

        try {
            $this->getHelper()->update($entity, $this->getHelperConfiguration()->getFormType(), json_decode($this->getRequest()->getContent(), true));
        } catch (ValidationException $e) {
            return new Response($this->get('jms_serializer')->serialize($e->getForm(), 'json'), 400);
        }

        $em->flush();
        $view = $this->getHelperConfiguration()->getView();
        $view->serialize($entity);

        return new Response($this->get('jms_serializer')->serialize($view->getData(), 'json'));
    }

    protected function handleCreate($entity)
    {
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