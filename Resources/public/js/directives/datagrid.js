angular.module('DataGrid')
    .directive('datagrid', function() {
        var directiveDefinitionObject = {
            restrict: 'E',
            transclude: true,
            templateUrl: '/bundles/samsondatagrid/views/datagrid.html',
            replace: true,
            controller: function($scope, $attrs) {
                $scope.sortable = true;
                $scope.columns = [];
                $scope.sortData = { column: null, inverse: false };
                $scope.filter = "";
                $scope.page = 1;
                $scope.pageSize = ($attrs['pagesize'] ? $attrs['pagesize'] : 5);
                
                $scope.addColumn = function(column) {
                    $scope.columns.push(column);
                };
                $scope.getCellTemplate = function(column, row) {
                    if (row.form && row.form.widgets[column.name]) {
                        return '/bundles/samsondatagrid/views/form-cell.html';
                    }
                    
                    return column.cellTemplate || '/bundles/samsondatagrid/views/cell.html';
                };
            }
        };
        return directiveDefinitionObject;
    })
;
