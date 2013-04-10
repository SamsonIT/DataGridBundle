
angular.module('DataGrid')
    .directive('knpPaginatedData', function() {
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

                        $scope.parsePaginationData = function(data) {
                            $scope.paginationData = data;
                            $scope.rows = [];
                            for (i in data.items) {
                                $scope.rows.push({ data: data.items[i] });
                            }
                            if (data.params.sort) {
                                for (i in $scope.columns) {
                                    if ($scope.columns[i].sortField == data.params.sort) {
                                        $scope.sortData.column = $scope.columns[i];
                                        $scope.sortData.inverse = data.params.direction == 'desc';
                                    }
                                }
                            }
                        }

                        $scope.parsePaginationData(data);
                    }
                };
            },
            controller: function($scope, $http, $transclude) {
                var routeParams = { page: $scope.paginationData.page || null, sort: $scope.paginationData.sort || null, direction: $scope.paginationData.direction || null };
                var getIndexParams = function(params) {
                    return angular.extend(routeParams, params);
                }
                
                $scope.$parent.getPage = function() {
                    return $scope.paginationData.current_page_number;
                }
                $scope.$parent.setPage = function(page) {
                    $http.get(Routing.generate($scope.paginationData.route, getIndexParams({ page: page }))).success(function(data) {
                        $scope.parsePaginationData(data);
                    });
                }
                $scope.$parent.sort = function(column) {
                    if (!column.sortField) {
                        return;
                    }
                    
                    var sortData = { sort: column.sortField };
                    if ($scope.sortData.column == column) {
                        sortData.direction = $scope.sortData.inverse ? 'asc' : 'desc';
                    } else {
                        sortData.direction = 'asc';
                    }
                    
                    $http.get(Routing.generate($scope.paginationData.route, getIndexParams(sortData))).success(function(data) {
                        $scope.parsePaginationData(data);
                    });
                    
//                    if ($scope.sortData.column === column) {
//                        $scope.sortData.inverse = !$scope.sortData.inverse;
//                    } else {
//                        $scope.sortData.column = column;
//                        $scope.sortData.inverse = false;
//                    }
                }
                $scope.$parent.newRows = function() {
                    var rows = [];

                    for (i in $scope.rows) {
                        if ($scope.rows[i].new) {
                            rows.push($scope.rows[i]);
                        }
                    }

                    return rows;
                }          
                $scope.$parent.existingRows = function() {
                    var rows = [];

                    for (i in $scope.rows) {
                        if (!$scope.rows[i].new) {
                            rows.push($scope.rows[i]);
                        }
                    }

                    return rows;
                }

                $scope.$parent.filteredRows = function() {
                    return $scope.existingRows();
                }
                $scope.$parent.sortedRows = function() {
                    return $scope.filteredRows();
                }
                $scope.$parent.visibleRows = function() {
                    return $scope.sortedRows();
                }

                $scope.$parent.pages = function() {
                    var pages = [];
                    for (var i = 1; i <= Math.ceil($scope.paginationData.total_count / $scope.paginationData.num_items_per_page); i++) {
                        pages.push(i);
                    }
                    return pages;
                }
                
                $scope.$parent.getColumnClasses = function(column) {
                    var classes = { sortable: column.sortField || false }
                    if (classes.sortable && column === $scope.sortData.column) {
                        classes.sorting_asc = !$scope.sortData.inverse;
                        classes.sorting_desc = $scope.sortData.inverse;
                    }
                    return classes;
                }
            }
        }
    })
;
