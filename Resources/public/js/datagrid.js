angular.module('DataGrid', [])
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
                $scope.pageSize = 5;
                
                $scope.addColumn = function(column) {
                    $scope.columns.push(column);
                }
                $scope.getCellTemplate = function(column, row) {
                    if (row.form && row.form.widgets[column.name]) {
                        return '/bundles/samsondatagrid/views/form-cell.html';
                    }
                    
                    return column.cellTemplate || '/bundles/samsondatagrid/views/cell.html';
                }
            }
        }
        return directiveDefinitionObject;
    })
    .directive('columns', function() {
        return {
            require: "^datagrid",
            restrict: "E",
            template: '',
            replace: true,
            transclude: true,
            compile: function compile(tElement, tAttrs, transclude) {
                return {
                    pre: function preLink($scope) {
                        transclude($scope);
                    }
                };
            }
        };
    })
    .directive('column', function() {
        return {
            require: "^?columns",
            restrict: "E",
            template: '',
            replace: true,
            transclude: true,
            compile: function compile(tElement, tAttrs, transclude) {
                return {
                    pre: function preLink($scope, iElement, iAttrs) {
                        var data = transclude($scope);
                        var column = {};
                        for (i in iAttrs.$attr) {
                            column[i] = iAttrs[i];
                        }
                        column.label = column.label || column.name;
                        $scope.addColumn(column);
                    }
                };
            }
        };
    })
    .directive('crud', function() {
        return {
            require: "^datagrid",
            restrict: "E",
            template: '',
            replace: true,
            transclude: true,
            compile: function compile(tElement, tAttrs, transclude) {
                return {
                    pre: function preLink($scope, iElement, iAttrs) {
                        $scope.actions = {};
                        transclude($scope);
                        
                        var getUrlParams = function(defaults, action) {
                            var params = { _format: 'html' };
                            if ($scope.actions[action].inline) {
                                params._format = 'json';
                            }
                            return angular.extend(params, defaults);
                        }
                        
                        $scope.generateEditUrl = function(route, row) {
                            if( !route ) { return }
                            return Routing.generate(route, getUrlParams({ id: row.data.id }, 'edit'));
                        }
                        
                        $scope.generateCreateUrl = function(route, row) {
                            if( !route ) { return }
                            return Routing.generate(route, getUrlParams({}, 'create'));
                        }
                        
                        $scope.generateDeleteUrl = function(route, row) {
                            if( !route ) { return }
                            return Routing.generate(route, getUrlParams({ id: row.data.id }, 'delete'));
                        }
                    }
                };
            },
            controller: function($scope, $http) {
                $scope.editRow = function(row, e) {
                    if ($scope.actions['edit'].inline) {
                        e.preventDefault();

                        $http.get($(e.target).attr('href')).success(function(data) {
                            $scope.loadForm(row, data);
                            row.form.action = $(e.target).attr('href');
                        });
                    }
                }
                $scope.createRow = function(e) {
                    if ($scope.actions['create'].inline) {
                        e.preventDefault();
                        var row = {new: true, data: {}};
                        $scope.rows.push(row);

                        $http.get($(e.target).attr('href')).success(function(data) {
                            $scope.loadForm(row, data);
                            row.form.action = $(e.target).attr('href');
                        });
                    }
                }
                $scope.deleteRow = function(row, e) {
                    if ($scope.actions['create'].inline) {
                        e.preventDefault();
                        
                        if (!confirm('Delete this row?')) {
                            return;
                        }
                        
                        $http.delete($(e.target).attr('href')).success(function(data) {
                            var index = $scope.rows.indexOf(row);
                            if (index < 0) {
                                throw Error('row not found in scope rows');
                            }
                            $scope.rows.splice(index, 1);
                        });
                    }
                }
                $scope.loadForm = function(row, data) {
                    row.form = {
                        widgets: {},
                        errors: $("<div>").html(data.errors).text()
                    };
                    for (i in data.widgets) {
                        row.form.widgets[i] = {
                            widget: $("<div>").html(data.widgets[i].widget).text(),
                            error: $("<div>").html(data.widgets[i].error).text()
                        };
                    }
                }
                $scope.saveRow = function(row, e) {
                    e.preventDefault();
                    var method = 'put';
                    if (row.new) {
                        method = 'post';
                    }
                    
                    var $tempForm = $("<form>");
                    var $row = $(e.target).closest('tr');
                    $row.find(':input').each(function() {
                        $tempForm.append($(this).clone());
                    });
                    $tempForm.append(row.form.widgets._token.widget);
                    
                    var config = {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    };
                    $http[method](row.form.action, $tempForm.serialize(), config).success(function(data) {
                        row.data = data;
                        delete row.form;
                    }).error(function(data, status) {
                        if (status == 400) {
                            $scope.loadForm(row, data);
                        }
                    });
                }
            }
        };
    })
    .directive('action', function() {
        return {
            require: "^?crud",
            restrict: "E",
            template: '',
            replace: true,
            transclude: true,
            compile: function compile(tElement, tAttrs, transclude) {
                return {
                    pre: function preLink($scope, iElement, iAttrs) {
                        var type = iAttrs.type;
                        var inline = typeof(iAttrs.inline) != 'undefined';
                        var route = transclude($scope).text();

                        $scope.actions[type] = {
                            route: route,
                            inline: inline
                        };
                    }
                };
            },
        };
    })
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
                        var data = angular.fromJson(transclude($scope)[0].innerText);
                        for (i in data) {
                            $scope.rows.push({ data: data[i] });
                        }
                    }
                };
            },
            controller: function($scope, $filter) {

                $scope.$parent.getPage = function() {
                    return $scope.page;
                }
                $scope.$parent.setPage = function(page) {
                    $scope.page = page;
                }
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
                    if ($scope.filter.length) {
                        return $filter('filter')($scope.existingRows(), { data: $scope.filter });
                    }
                    return $scope.existingRows();
                }
                $scope.$parent.sortedRows = function() {
                    if ($scope.sortData.column) {
                        return $filter('orderBy')($scope.filteredRows(), 'data.'+$scope.sortData.column.name, $scope.sortData.inverse);
                    }
                    return $scope.filteredRows();
                }
                $scope.$parent.visibleRows = function() {
                    var rows = $scope.sortedRows();
                    rows = rows.slice(($scope.page - 1) * $scope.pageSize, $scope.page * $scope.pageSize);
                    return rows;
                }

                $scope.$parent.pages = function() {
                    var pages = [];
                    for (var i = 1; i <= Math.ceil($scope.filteredRows().length / $scope.pageSize); i++) {
                        pages.push(i);
                    }                 
                    return pages;
                }
                $scope.$parent.getColumnClasses = function(column) {
                    var classes = { sortable: $scope.sortable }
                    if ($scope.sortable && column === $scope.sortData.column) {
                        classes.sorting_asc = !$scope.sortData.inverse;
                        classes.sorting_desc = $scope.sortData.inverse;
                    }
                    return classes;
                }
                
            }
        }
    })
;
