angular.module('Samson.DataGrid')
    .directive('datagrid', function($locale) {

        switch($locale.id) {
            case 'nl-nl':
                var resultDataText = "{{ firstResult }} t/m {{ lastResult }} van {{ filteredResults }} resultaten getoond (totaal: {{ totalResults }})";
                break;
            default:
                var resultDataText = "{{ firstResult }} through {{ lastResult }} of {{ filteredResults }} results displayed (total: {{ totalResults }})";
                break;
        }

        var directiveDefinitionObject = {
            restrict: 'E',
            transclude: true,
            scope: true,
            templateUrl: '/bundles/samsondatagrid/views/datagrid.html',
            replace: true,
            compile: function(tElement, tAttr) {
                if ('ngRowController' in tAttr) {
                    tElement.find('tbody[ng-repeat]').attr('ng-controller', tAttr.ngRowController);
                }

                return function($scope, iElement, iAttr) {
                    var data = null;

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
                    if ('filterColumns' in iAttr) {
                        $scope.filterColumns = iAttr.filterColumns.split(',');
                    }
                    if ($scope.data) {
                        data = $scope.data;
                    } else if ('data' in iAttr) {
                       data = angular.fromJson(iAttr['data']);
                    }
                    if ('service' in iAttr) {
                        $scope.dataService = iAttr.service;
                    }
                    if ('ngRowController' in iAttr) {
                        $scope.rowController = iAttr.ngRowController;
                    }
                    if ('filterTemplate' in iAttr){
                        $scope.filterTemplate = iAttr.filterTemplate;
                    }
                    if ('colgroupTemplate' in iAttr){
                        $scope.colgroupTemplate = iAttr.colgroupTemplate;
                    }
                    $scope.driver = $scope.instantiateDriver('driver' in iAttr ? iAttr['driver'] : 'clientside');

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

                    var loadingEl = null;
                    $scope.$watch('loading', function(val) {
                        if (!val && loadingEl) {
                            setTimeout(function() {
                                loadingEl.width(iElement.find('.table').width()).height(iElement.find('.table').height());
                            }, 0);
                            loadingEl.fadeTo(500, 0, function() {
                                loadingEl.remove();
                                loadingEl = null;
                            })
                        } else if (val && !loadingEl) {
                            loadingEl = $("<div>").appendTo('body').css({ position: 'absolute', backgroundColor: 'white' }).position({ my: 'left top', at: 'left top', of: iElement.find('.table') })
                                .width(iElement.find('.table').width()).height(iElement.find('.table').height())
                                .fadeTo(0, 0).fadeTo(500, .85);
                        }
                    })

                    $scope.setData(data);
                }
            },
            controller: function($scope, $templateCache, $injector, $parse, $q, $timeout, $interpolate) {
                $scope.editing = [];
                $scope.newRows = [];
                $scope.filter = {};

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
                $scope.filterTemplate = '/bundles/samsondatagrid/views/filter.html';
                $scope.colgroupTemplate = null;

                $scope.visibleRows = [];

                $scope.$watch('filterColumns', function(newValue) {
                    callDriver('setFilterFields', newValue);
                })

                $scope.instantiateDriver = function(name) {
                    return $injector.instantiate(drivers[name]);
                }

                var getDriver = function() {
                    return $scope.driver;
                }
                var callDriver = function(method) {
                    driver = getDriver();
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

                    return 'transformResponse' in service ? service.transformResponse(data) : data;
                }

                this.addRow = function(data) {
                    callDriver('addRow', data, self.transform);
                    self.updateData();
                }
                this.refresh = function() {
                    $q.when(callDriver('setPage', $scope.page)).then(self.updateData);
                }

                $scope.setData = function(data) {
                    if (null === data) {
                        service = $injector.get($scope.dataService);
                        service.datagridCtrl = self;
                        if ('getData' in service) {
                            data = service.getData();
                        }
                    }

                    getDriver().loading = true;
                    $q.when(data).then(function(data) {
                        callDriver('setData', data, self.transform);
                        getDriver().loading = false;

                        self.updateData();
                    }, function(reason) {
                        throw Error('Error while fetching data: '+reason);
                    });
                }
                this.updateData = function() {
                    var properties = ['visibleRows', 'firstResult', 'lastResult', 'totalResults', 'filteredResults', 'page', 'pages', 'sort'];
                    for (var i in properties) {
                        var property = properties[i];
                        $scope[property] = callDriver('get'+ property.charAt(0).toUpperCase() + property.slice(1));
                    }

                    $scope.$broadcast('data.updated', callDriver('getVisibleRows'));
                }

                $scope.setPage = function(page) {
                    if( $scope.waiting ) {
                        $timeout.cancel($scope.waiting);
                    }
                    $scope.waiting = $timeout( function(){
                        var result = callDriver('setPage', page);

                        if (angular.isObject(result) && 'then' in result) {
                            result.then(function() {
                                self.updateData();
                            });

                            return;
                        }

                        self.updateData();
                    },200)

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
                $scope.viewPath = function(row, extraParams) {
                    return Routing.generate($scope.routes['view'], generateIdParams(row, extraParams));
                }
                $scope.editPath = function(row, extraParams) {
                    return Routing.generate($scope.routes['edit'], generateIdParams(row, extraParams));
                }
                $scope.deletePath = function(row, extraParams) {
                    return Routing.generate($scope.routes['delete'], generateIdParams(row, extraParams));
                }

                $scope.getRowTemplate = function(row) {
                    return $scope.editing.indexOf(row) > -1 || $scope.newRows.indexOf(row) > -1 ? $scope.formTemplate : $scope.bodyTemplate;
                }

                $scope.edit = function(row) {
                    row.$originalData = {};
                    for (var i in row) {
                        if (i == '$originalData') {
                            continue;
                        }
                        row.$originalData[i] = row[i];
                    }
                    $scope.editing.push(row);
                }
                $scope.create = function() {
                    var row = self.transform({});
                    $scope.newRows.push(row);
                    return row;
                }
                $scope.cancel = function(row) {
                    var newRowsIndex = $scope.newRows.indexOf(row);
                    if (newRowsIndex > -1) {
                        $scope.newRows.splice(newRowsIndex, 1);
                        return;
                    }

                    for (var i in row.$originalData) {
                        row[i] = row.$originalData[i];
                    }
                    angular.copy(row.$originalData, row);
                    delete row.$originalData;
                    $scope.editing.splice($scope.editing.indexOf(row), 1);
                }

                $scope.$watch('filter.value', function(newValue) {
                    var result = callDriver('filter', newValue);

                    if (angular.isObject(result) && 'then' in result) {
                        result.then(function() {
                            self.updateData();
                        });

                        return;
                    }

                    self.updateData();
                }, true );

                $scope.$on('row.updated', function(e, row) {
                    $scope.editing.splice($scope.editing.indexOf(row), 1);
                    var transformedRow = self.transform(row);
                    for (var i in transformedRow) {
                        row[i] = transformedRow[i];
                    }
                    self.updateData();
//                    self.paginateToObject(row);
                });
                $scope.$on('row.created', function(e, row) {
                    callDriver('addRow', row, self.transform);
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

                $scope.$watch(function() {
                    return getDriver().loading;
                }, function(val) {
                    $scope.loading = val;
                })

                $scope.$watch('firstResult + lastResult + filteredResults + totalResults', function() {
                    $scope.resultData = $interpolate(resultDataText)($scope);
                });
            }
        };
        return directiveDefinitionObject;
    }).directive('datagridRow', function($compile, $templateCache, $http) {
        return {
            restrict: 'A',
            require: '^datagrid',
            link: function($scope, iElement, iAttr, datagridCtrl) {
                if (datagridCtrl.getDataService()) {
                    $scope.setDataService(datagridCtrl.getDataService());
                }

                $scope.$watch(function() {
                    return $scope.getRowTemplate($scope.row);
                }, function(newTemplateId) {
                    $http.get(newTemplateId, {cache: $templateCache}).success(function(template) {
                        var $template = $(template);
                        $template.find('input[name], textarea[name], select[name]').each(function() {
                           $(this).attr('tooltip', '{{ errors["'+$(this).attr('name')+'"] }}').attr('tooltip-html', true);
                        });

                        $compile($template)($scope, function(clonedElement) {
                            iElement.empty().append(clonedElement);
                        });
                    });
                });

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
                    }).error( function() {
                        $scope.$emit('row.deleting_failed', row);
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

                        if (method == 'put') {
                            angular.copy(data, row);
                            $scope.$emit('row.updated', row);
                        } else {
                            if (angular.isArray(data)) {
                                for (var i in data) {
                                    $scope.$emit('row.created', data[i]);
                                }
                            } else {
                                angular.copy(data, row);
                                $scope.$emit('row.created', row);
                            }
                        }
                    }).error(function(data) {

                        if (angular.isObject(data)) {
                            data.errors = data.errors || [];
                            data.errors.unshift('The form has errors');
                        } else {
                            data = { errors: 'An error occurred while saving' };
                        }
                        $scope.hasErrors = true;
                        $scope.$broadcast('errors.updated', data);

                        var errors = new ErrorContainer(data);
                        $scope.errors = {};

                        for (var i in $scope.form) {
                            if (i[0] == '$') {
                                continue;
                            }

                            var fieldErrors = errors.read(i);
                            $scope.form[i].$setValidity('server', !fieldErrors.length);
                            $scope.errors[i] = "<ul>";
                            fieldErrors.forEach(function(error) {
                                $scope.errors[i] += "<li>"+error+"</li>";
                            });
                            $scope.errors[i] += "</ul>";
                        }
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
                        iElement.removeClass('sorting sorting-asc sorting-desc');

                        if (name == newValue[0]) {
                            iElement.addClass('sorting-'+newValue[1]);
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
            link: function($scope, iElement, iAttr) {
                var $row = iElement.closest('tr');

                var action = function() {
                    if (iElement.prop('tagName') == 'A' && !iAttr['dataDialog']) {
                        window.location.href = iAttr.href;
                    } else {
                        iElement.trigger('click');
                    }
                }

                $row
                    .css('cursor', 'pointer')
                    .on('click', function(e) {
                        if (!$(e.target).is('a') && !($(e.target).closest('a, input').length)) {
                            action();
                            e.preventDefault();
                        }
                    })
                ;
            }
        }
    }).directive('datagridFilterbox', function(){
        return {
            restrict: 'E',
            replace: true,
            template: '<input type="text" ng-model="filter.value" ng-list="/\\s+/" autocapitalize="off">'
        }
    })
;
