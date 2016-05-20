<?php
namespace Samson\Bundle\DataGridBundle\Helper;

trait DataGridVersionDeterminerTrait
{


    function getDataGridVersion()
    {
        if (defined('Samson\Bundle\DataGridBundle\Helper\ControllerHelper::DATAGRID_VERSION')) {
            return ControllerHelper::DATAGRID_VERSION;
        }
        return 1;
    }
}