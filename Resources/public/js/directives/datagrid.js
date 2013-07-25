angular.module('Samson.DataGrid')
    .directive('datagrid', function() {
        var directiveDefinitionObject = {
            restrict: 'E',
            transclude: true,
            templateUrl: '/bundles/samsondatagrid/views/datagrid.html',
            replace: true,
            compile: function(tElement, tAttr) {
                if ('ngRowController' in tAttr) {
                    tElement.find('tbody[ng-repeat]').attr('ng-controller', tAttr.ngRowController);
                }

                return function($scope, iElement, iAttr) {
                    var data = [];

                    if ('headerTemplate' in iAttr) {
                        $scope.headerTemplate = iAttr['headerTemplate'];
                    }
                    if ('bodyTemplate' in iAttr) {
                        $scope.bodyTemplate = iAttr['bodyTemplate'];
                    }
                    if ('formTemplate' in iAttr) {
                        $scope.formTemplate = iAttr['formTemplate'];
                    }
                    if ('noResultsTemplate' in iAttr) {
                        $scope.noResultsTemplate = iAttr['noResultsTemplate'];
                    }
                    if ('data' in iAttr) {
                        data = angular.fromJson(iAttr['data']);
                    }
                    if ('filterColumns' in iAttr) {
                        $scope.filterColumns = iAttr.filterColumns.split(',');
                    }
                    if ('service' in iAttr) {
                        $scope.dataService = iAttr.service;
                    }
                    if ('ngRowController' in iAttr) {
                        $scope.rowController = iAttr.ngRowController;
                    }
                    $scope.driver = 'driver' in iAttr ? iAttr['driver'] : 'clientside';
                    if(iAttr.routes) {
                        $scope.routes = $scope.$eval('{'+iAttr.routes+'}');
                    }
                    $scope.routeParams = {};
                    if (iAttr.routeParams) {
                        $scope.routeParams = $scope.$eval(iAttr.routeParams);
                    }
                    $scope.idMap = { id: 'row.id' };
                    if (iAttr.idMap) {
                        $scope.idMap = $scope.$eval(iAttr.idMap);
                    }


                    $scope.setData(data);

                    setTimeout(function() {
                        $scope.$apply(
                            function() {
                                var $headerCells = iElement.find('thead:eq(0) tr:eq(0)').find('th, td');
                                var count = 0;
                                $headerCells.each(function() {
                                    count += parseInt($(this).attr('colspan')) || 1;
                                });

                                $scope.columnCount = count;
                            }

                        );
                    });
                }
            },
            controller: function($scope, $attrs, $templateCache, $injector, $parse, $http) {
                $scope.editing = [];
                $scope.newRows = [];

                this.getDataService = function() {
                    return $scope.dataService;
                }

                var self = this;
                $scope.headerTemplate = 'datagrid-no-header.html';
                $templateCache.put('datagrid-no-header.html', '<tr><th>You need to define a header template!</th></tr>');
                $scope.bodyTemplate = 'datagrid-no-body.html';
                $templateCache.put('datagrid-no-body.html', '<tr><td>You need to define a body template!</td></tr>');
                $scope.formTemplate = 'datagrid-no-form.html';
                $templateCache.put('datagrid-no-form.html', '<tr><td>You need to define a form template!</td></tr>');
                $scope.noResultsTemplate = 'datagrid-no-results.html';
                $templateCache.put('datagrid-no-results.html', '<td colspan="{{ columnCount }}">No results</td>');
                $scope.driver = 'clientside';

                $scope.visibleRows = [];

                $scope.$watch('filterColumns', function(newValue) {
                    callDriver('setFilterFields', newValue);
                })

                var callDriver = function(method) {
                    var driver = $injector.get('datagrid.driver.'+$scope.driver);
                    if (typeof(driver) == 'undefined') {
                        throw Error('The driver datagrid.driver.'+$scope.driver+' was not found');
                    }
                    if (!(method in driver)) {
                        throw Error('The driver has no method '+method);
                    }
                    return driver[method].apply(driver, Array.prototype.slice.call(arguments, 1));
                }

                this.transform = function(data) {
                    if (!$scope.dataService) {
                        return data;
                    }

                    var service = $injector.get($scope.dataService);

                    return service.transformResponse(data);
                }

                $scope.setData = function(data) {
                    callDriver('setData', data, self.transform);
                    self.updateData();
                }
                this.updateData = function() {
                    var properties = ['visibleRows', 'firstResult', 'lastResult', 'totalResults', 'filteredResults', 'page', 'pages', 'sort'];
                    for (var i in properties) {
                        var property = properties[i];
                        $scope[property] = callDriver('get'+ property.charAt(0).toUpperCase() + property.slice(1));
                    }

                    return;
                }

                $scope.setPage = function(page) {
                    var result = callDriver('setPage', page);

                    if (angular.isObject(result) && 'then' in result) {
                        result.then(function() {
                            self.updateData();
                        });

                        return;
                    }

                    self.updateData();
                }

                this.sort = function(sortField) {
                    var result = callDriver('sort', sortField);

                    if (angular.isObject(result) && 'then' in result) {
                        result.then(function() {
                            self.updateData();
                        });

                        return;
                    }

                    self.updateData();
                }

                $scope.isEditable = function(row) {
                    return $scope.visibleRows.indexOf(row) > -1;
                }

                var generateParams = function(extraParams) {
                    extraParams = typeof(extraParams) == 'undefined' ? {} : extraParams;

                    return angular.extend(extraParams, $scope.routeParams)
                }
                var generateIdParams = function(row, extraParams) {
                    var params = {};

                    for (var i in $scope.idMap) {
                        var map = $scope.idMap[i];

                        params[i] = $parse(map.substring(4))(row);
                    }

                    return generateParams($.extend(extraParams, params));
                }

                $scope.createPath = function(extraParams) {
                    extraParams = typeof(extraParams) == 'undefined' ? {} : extraParams;
                    return Routing.generate($scope.routes['create'], generateParams(extraParams));
                }
                $scope.editPath = function(row, extraParams) {
                    return Routing.generate($scope.routes['edit'], generateIdParams(row, extraParams));
                }
                $scope.deletePath = function(row, extraParams) {
                    return Routing.generate($scope.routes['delete'], generateIdParams(row, extraParams));
                }

                $scope.getRowTemplate = function(row) {
                    return $scope.editing.indexOf(row) > -1 ? $scope.formTemplate : $scope.bodyTemplate;
                }

                $scope.edit = function(row) {
                    $scope.editing.push(row);
                }
                $scope.create = function() {
                    $scope.newRows.push(self.transform({}));
                }
                $scope.cancel = function(row) {
                    $scope.editing.splice($scope.editing.indexOf(row), 1);
                }


                $scope.$watch('filter', function(newValue) {
                    var result = callDriver('filter', newValue);

                    if (angular.isObject(result) && 'then' in result) {
                        result.then(function() {
                            self.updateData();
                        });

                        return;
                    }

                    self.updateData();
                })

                $scope.$on('row.updated', function(e, row) {
                    $scope.editing.splice($scope.editing.indexOf(row), 1);
                    angular.copy(this.transform(row), row);
                    self.updateData();
//                    self.paginateToObject(row);
                });
                $scope.$on('row.created', function(e, row) {
                    callDriver('addRow', row, this.transform);
                    callDriver('update');
                    $scope.newRows.splice($scope.editing.indexOf(row), 1);
                    self.updateData();
//                    self.paginateToObject(row);
                })

                $scope.$on('row.deleted', function(e, row) {
                    callDriver('deleteRow', row);
                    $scope.editing.splice($scope.editing.indexOf(row), 1);
                    self.updateData();
                })
            }
        };
        return directiveDefinitionObject;
    }).directive('datagridRow', function() {
        return {
            restrict: 'A',
            require: '^datagrid',
            link: function($scope, iElement, iAttr, datagridCtrl) {
                if (datagridCtrl.getDataService()) {
                    $scope.setDataService(datagridCtrl.getDataService());
                }
            },
            controller: function($scope, $http, $injector) {
                $scope.hasErrors = false;

                var dataService = {};

                $scope.setDataService = function(dataservice) {
                    dataService = $injector.get($scope.dataService);
                }

                $scope.delete = function(row) {
                    if (!confirm('Are you sure you wish to delete this row?')) {
                        return;
                    }

                    $http.delete($scope.deletePath(row, { _format: 'json' }), row).success(function() {
                        $scope.$emit('row.deleted', row);
                    })
                }

                $scope.save = function(row) {
                    var method;
                    var url;

                    if ($scope.isEditable(row)) {
                        method = 'put';
                        url = $scope.editPath(row, { _format: 'json' });
                    } else {
                        method = 'post';
                        url = $scope.createPath({ _format: 'json' });
                    }

                    var options = {};

                    if ('transformRequest' in dataService) {
                        options.transformRequest = dataService.transformRequest;
                    }

                    $http[method](url, row, options).success(function(data) {
                        $scope.$broadcast('errors.updated', {});
                        $scope.hasErrors = false;

                        angular.copy(data, row);
                        if (method == 'put') {
                            $scope.$emit('row.updated', row);
                        } else {
                            $scope.$emit('row.created', row);
                        }
                    }).error(function(data) {
                        data.errors = data.errors || [];
                        data.errors.unshift('The form has errors');
                        $scope.hasErrors = true;
                        $scope.$broadcast('errors.updated', data);
                    });
                }
            }
        }
    }).directive('datagridErrors', function() {
        return {
            restrict: 'A',
            require: '^datagridRow',
            scope: true,
            template: '<div ng-repeat="error in errors">{{ error }}</div>',
            link: function($scope, iElement, iAttr, datagrid) {
                $scope.errors = [];
                $scope.path;

                if (iAttr.datagridErrors) {
                    var pathParts = iAttr.datagridErrors.split('.');
                    for (var i = pathParts.length - 1; i >= 0; i--) {
                        pathParts.splice(i, 0, 'children');
                    }
                    $scope.path = pathParts.join('.') + '.errors';
                } else {
                    $scope.path = 'errors';
                }
            },
            controller: function($scope, $parse) {
                $scope.$on('errors.updated', function(e, data) {
                    $scope.errors = $parse($scope.path)(data);
                })
            }
        }
    }).directive('sortable', function() {
        return {
            restrict: 'A',
            require: '^datagrid',
            link: function($scope, iElement, iAttr, datagrid) {
                var name = iAttr.sortable || iAttr.text().toLowerCase();
                iElement.click(function() {
                    $scope.$apply(function() {
                        datagrid.sort(name);
                    })
                });

                $scope.$watch('sort', function(newValue) {
                    if (typeof(newValue) != 'undefined') {
                        iElement.removeClass('sorting sorting_asc sorting_desc');

                        if (name == newValue[0]) {
                            iElement.addClass('sorting_'+newValue[1]);
                        } else {
                            iElement.addClass('sorting');
                        }
                    } else {
                        iElement.addClass('sorting');
                    }
                });
            }
        }
    }).directive('rowClick', function() {
        return {
            restrict: 'A',
            link: function($scope, iElement) {
                iElement.closest('tr')
                    .css('cursor', 'pointer')
                    .on('click', function(e) {
                    if (!$(e.target).is('a') && !($(e.target).closest('a, input').length)) {
                        iElement.click();
                        e.preventDefault();
                    }
                })
            }
        }
    })
;
