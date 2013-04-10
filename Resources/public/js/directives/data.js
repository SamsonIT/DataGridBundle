angular.module('DataGrid')
    .directive('data', function() {
        return {
            require: "^datagrid",
            restrict: 'E',
            templateUrl: '/bundles/samsondatagrid/views/table.html',
            transclude: true,
            replace: true,
            compile: function compile(tElement, tAttrs, transclude) {
                return {
                    pre: function preLink($scope, iElement, iAttrs, controller) {
                        $scope.rows = [];
                        var data = angular.fromJson(transclude($scope).text());
                        for (i in data) {
                            $scope.rows.push({ data: data[i] });
                        }
                    }
                };
            },
            controller: function($scope, $filter) {

                $scope.$parent.getPage = function() {
                    return $scope.page;
                };
                $scope.$parent.setPage = function(page) {
                    $scope.page = page;
                };
                $scope.$parent.sort = function(column) {
                    if (!$scope.sortable) {
                        return;
                    }
                    if ($scope.sortData.column === column) {
                        $scope.sortData.inverse = !$scope.sortData.inverse;
                    } else {
                        $scope.sortData.column = column;
                        $scope.sortData.inverse = false;
                    }
                };
                $scope.$parent.newRows = function() {
                    var rows = [];

                    for (i in $scope.rows) {
                        if ($scope.rows[i].new) {
                            rows.push($scope.rows[i]);
                        }
                    }

                    return rows;
                };  
                $scope.$parent.existingRows = function() {
                    var rows = [];

                    for (i in $scope.rows) {
                        if (!$scope.rows[i].new) {
                            rows.push($scope.rows[i]);
                        }
                    }

                    return rows;
                };

                $scope.$parent.filteredRows = function() {
                    if ($scope.filter.length) {
                        return $filter('filter')($scope.existingRows(), { data: $scope.filter });
                    }
                    return $scope.existingRows();
                };
                $scope.$parent.sortedRows = function() {
                    if ($scope.sortData.column) {
                        return $filter('orderBy')($scope.filteredRows(), 'data.'+$scope.sortData.column.name, $scope.sortData.inverse);
                    }
                    return $scope.filteredRows();
                };
                $scope.$parent.visibleRows = function() {
                    var rows = $scope.sortedRows();
                    rows = rows.slice(($scope.page - 1) * $scope.pageSize, $scope.page * $scope.pageSize);
                    return rows;
                };

                $scope.$parent.pages = function() {
                    var pages = [];
                    for (var i = 1; i <= Math.ceil($scope.filteredRows().length / $scope.pageSize); i++) {
                        pages.push(i);
                    }                 
                    return pages;
                };
                $scope.$parent.getColumnClasses = function(column) {
                    var classes = { sortable: $scope.sortable }
                    if ($scope.sortable && column === $scope.sortData.column) {
                        classes.sorting_asc = !$scope.sortData.inverse;
                        classes.sorting_desc = $scope.sortData.inverse;
                    }
                    return classes;
                };
                
            }
        };
    })
;