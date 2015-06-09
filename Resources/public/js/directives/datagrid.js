/**
 * Samson DataGrid Directive
 *
 * ** Requires ngLocale to be able to determine what language the results should be translated in.** (current values: nl-nl or default
 * ** Requires jQuery
 * ** Requires FOSJSRouting for Routing.generate
 *
 * Default usage:
 *
 * ``<datagrid data="{{json encoded data or handle to angular array }}">``
 *
 * more examples:
 * <datagrid header-template="header-template" body-template="body-template" driver="knp-paginator" ng-controller="ProjectGridCtrl" filter-columns="project.clientReference,project.number,billingCompany.name, project.location, project.start" linked-filter=".toggle-filter-form"></datagrid>
 *
 * Mandatory attributes:
 * - header-template:  templateurl or angular $templatecache index
 * - body-template:  templateurl or angular $templatecache index
 * - form-template:  templateurl or angular $templatecache index
 *
 * Optional attributes:
 *
 * - no-results-template:  templateurl or angular $templatecache index
 * - results-template:  templateurl or angular $templatecache index
 * - filter-columns:  comma separated list of columns to filter on (passed to driver)
 * - data: JSON encoded, or $scope data or null. If provided, used as initial input from driver with at least these properties:
 *         - visibleRows
 *         - firstResult
 *         - lastResult
 *         - totalResults
 *         - filteredResults
 *         - page
 *         - pages
 *         - sort
 *  -  service : if data is null, an angular factory that fetches data, implementing at least these functions:
 *          - getData
 *       optional functions:
 *          - transformRequest
 *          - transformResponse
 *  - ng-row-controller:   controller applied to each row
 *  - filter-template:  templateurl or angular $templatecache index to be used to create filters
 *  - colgroup-template:  templateurl or angular $templatecache index. included on top of the grid: <colgroup ng-include="colgroupTemplate && colgroupTemplate"></colgroup>
 *  - pagination-template:  templateurl or angular $templatecache index to be used to create pagination items.
 *  - driver: custom driver to access results. Defaults to 'clientside' which resolves to ../services/clientside.js. See the description for the 'data' attribute to see what should be in there.
 *  - routes: a not-really-json (no curly braces) key/value object with edit,view,create,delete indexes.
 *      Example: <datagrid routes="edit: 'security_usergroup_edit', create: 'security_usergroup_new', delete: 'security_usergroup_delete'">
 *  - route-params: Additional parameters to pass to routing.generate when generating a route specified above.
 *  - id-map : translation object to map an id to the right property of the row (for use in route-params)
 *      Example: <datagrid routes="create: 'nitro_person_contract_create'" id-map="{ contract: 'row.id' }">
 *      The route runs through routing.generate, which expects a 'contract' parameter, which will now resolve to row.id.
 *
 */

angular.module('Samson.DataGrid')
    .directive('datagrid', function($locale) {

        var resultDataText;

        switch ($locale.id) {
            case 'nl-nl':
                resultDataText = "{{ firstResult }} t/m {{ lastResult }} van {{ filteredResults }} resultaten getoond (totaal: {{ totalResults }})";
                break;
            default:
                resultDataText = "{{ firstResult }} through {{ lastResult }} of {{ filteredResults }} results displayed (total: {{ totalResults }})";
                break;
        }

        var service = {
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

                    // if an iAttr is present for the property, place it on the $scope.
                    function overrideAttribute(prop) {
                        if (!(prop in iAttr)) return;
                        $scope[prop] = iAttr[prop];
                    }

                    // override template attributes (since there's a load)
                    function overrideTemplates(names) {
                        names.map(function(tpl) {
                            overrideAttribute(tpl + 'Template');
                        });
                    }

                    // process other parameters that have non-standardized key/value mappings.
                    function optionalAttributes(properties) {
                        for (var property in properties) {
                            if (!(property in iAttr)) continue;
                            properties[property](iAttr[property]);
                        }
                    }

                    overrideTemplates(['header', 'body', 'form', 'noResults', 'results', 'colgroup', 'pagination', 'filter', 'footer']);

                    optionalAttributes({
                        ngRowController: function(prop) {
                            $scope.rowController = prop;
                        },
                        filterColumns: function(prop) {
                            $scope.filterColumns = prop.split(',');
                        },
                        routes: function(prop) {
                            $scope.routes = $scope.$eval('{' + prop + '}');
                        },
                        service: function(prop) {
                            $scope.dataService = prop;
                        }
                    });

                    if ($scope.data) {
                        data = $scope.data;
                    } else if ('data' in iAttr) {
                        data = angular.fromJson(iAttr.data);
                    }

                    $scope.driver = $scope.instantiateDriver(('driver' in iAttr) ? iAttr.driver : 'clientside');
                    $scope.routeParams = iAttr.routeParams ? $scope.$eval(iAttr.routeParams) : $scope.routeParams = {};
                    $scope.idMap = iAttr.idMap ? $scope.$eval(iAttr.idMap) : {
                        id: 'row.id'
                    };

                    // find all table header columns (td or th) within the first thead > tr
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

                    // overlay a div that's semi-transparent over most of the table to indicate it's loading.
                    var loadingEl = null;
                    $scope.$watch('loading', function(val) {
                        if (!val && loadingEl) {
                            setTimeout(function() {
                                loadingEl.width(iElement.find('.table').width()).height(iElement.find('.table').height());
                            }, 0);
                            loadingEl.fadeTo(500, 0, function() {
                                loadingEl.remove();
                                loadingEl = null;
                            });
                        } else if (val && !loadingEl) {
                            loadingEl = $("<div class='datagrid-loader'>").appendTo('body').css({
                                    position: 'absolute',
                                    backgroundColor: 'white',
                                    zIndex: 10000
                                }).position({
                                    my: 'left top',
                                    at: 'left top',
                                    of: iElement.find('.table')
                                })
                                .width(iElement.find('.table').width()).height(iElement.find('.table').height())
                                .fadeTo(0, 0).fadeTo(500, 0.85);
                        }
                    });

                    $scope.setData(data);
                };
            },
            controller: function($scope, $rootScope, $templateCache, $injector, $parse, $q, $timeout, $interpolate) {
                $scope.editing = [];
                $scope.newRows = [];
                $scope.filter = {};
                $scope.pagination = {
                    currentPage: 1
                };

                this.getDataService = function() {
                    return $scope.dataService;
                };

                var self = this;
                $scope.headerTemplate = 'datagrid-no-header.html';
                $templateCache.put('datagrid-no-header.html', '<tr><th>You need to define a header template!</th></tr>');
                $scope.bodyTemplate = 'datagrid-no-body.html';
                $templateCache.put('datagrid-no-body.html', '<tr><td>You need to define a body template!</td></tr>');
                $scope.formTemplate = 'datagrid-no-form.html';
                $templateCache.put('datagrid-no-form.html', '<tr><td>You need to define a form template!</td></tr>');
                $scope.noResultsTemplate = 'datagrid-no-results.html';
                $templateCache.put('datagrid-no-results.html', '<td colspan="{{ columnCount }}">No results</td>');
                $scope.resultsTemplate = 'datagrid-results.html';
                $templateCache.put('datagrid-results.html', '<p class="table-info">{{ resultData }}</p>');
                $scope.driver = 'clientside';
                $scope.filterTemplate = '/bundles/samsondatagrid/views/filter.html';
                $scope.paginationTemplate = '/bundles/samsondatagrid/views/pagination.html';
                $scope.colgroupTemplate = null;
                $scope.footerTemplate = null;

                $scope.visibleRows = [];

                $scope.$watch('filterColumns', function(newValue) {
                    if (newValue === undefined) return;
                    callDriver('setFilterFields', newValue.map(function(el) {
                        return el.trim();
                    }));
                });

                /**
                 * Create a new driver instance
                 * (needs to be resolveable via $injector)
                 * @param name
                 * @returns instantiated driver
                 */
                $scope.instantiateDriver = function(name) {
                    return $injector.instantiate(drivers[name]);
                };

                /**
                 * Return instantiated driver
                 * @returns {instantiated|*|$scope.driver}
                 */
                var getDriver = function() {
                    return $scope.driver;
                };

                /**
                 * Execute a method on the driver (if it exists)
                 */
                var callDriver = function(method) {
                    driver = getDriver();
                    if (!(method in driver)) {
                        throw Error('The driver has no method ' + method);
                    }
                    return driver[method].apply(driver, Array.prototype.slice.call(arguments, 1));
                };

                /**
                 * Transform the data with an optional 'transformReponse' method defined in the dataService
                 * (if that's defined)
                 */
                this.transform = function(data) {
                    if (!$scope.dataService) {
                        return data;
                    }

                    var service = $injector.get($scope.dataService);
                    return 'transformResponse' in service ? service.transformResponse(data) : data;
                };


                /**
                 * add a row to to the local array of data.
                 * @param data
                 */
                this.addRow = function(data) {
                    callDriver('addRow', data, self.transform);
                    self.updateData();
                };

                /**
                 * Wait for the promise that the setPage from the driver may execute, and then re-render.
                 */
                this.refresh = function() {
                    $q.when(callDriver('setPage', $scope.page)).then(self.updateData);
                };

                /**
                 * Manually set data.
                 * @param data
                 */
                this.forceData = function(data){
                    $scope.setData(data);
                };


                /**
                 * Set data on the driver (either automatically resolve the data or pass a data array with rows)
                 *
                 * Fetch data from  the dataService that's defined (if no argument passed)
                 * Then set the data on the driver that's defined, and call self.updateData to populate the $scope with
                 * updated values.
                 * @param data null || array data to set onto the service
                 */
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
                        throw Error('Error while fetching data: ' + reason);
                    });
                };

                /**
                 * iterate the properties that we expect from the driver to exist.
                 * call the get<ucFirst(property)> method on the driver and set the result on the current $scope.
                 * this makes sure that we actually end up with a $scope.visibleRows, firstResult, etc.
                 * Broadcasts a data.updated event when done.
                 */
                this.updateData = function() {
                    ['visibleRows', 'firstResult', 'lastResult', 'totalResults', 'filteredResults', 'page', 'pages', 'sort'].map(function(property) {
                        var res = callDriver('get' + property.charAt(0).toUpperCase() + property.slice(1));
                        if (property === 'page') {
                            $scope.pagination.currentPage = res;
                        } else {
                            $scope[property] = res;
                        }
                    });
                    $scope.$broadcast('data.updated', callDriver('getVisibleRows'));
                };

                /**
                 *
                 * @param page
                 */
                $scope.setPage = function(page) {
                    if ($scope.waiting) {
                        $timeout.cancel($scope.waiting);
                    }
                    $scope.waiting = $timeout(function() {
                        var result = callDriver('setPage', page);

                        if (angular.isObject(result) && 'then' in result) {
                            result.then(function() {
                                self.updateData();
                            });

                            return;
                        }

                        self.updateData();
                    }, 200);
                };

                this.sort = function(sortField) {
                    var result = callDriver('sort', sortField);
                    if (angular.isObject(result) && 'then' in result) {
                        result.then(self.updateData);
                        return;
                    }

                    self.updateData();
                };

                $scope.isEditable = function(row) {
                    return $scope.visibleRows.indexOf(row) > -1;
                };

                var generateParams = function(extraParams) {
                    return angular.extend(typeof(extraParams) == 'undefined' ? {} : extraParams, $scope.routeParams);
                };

                var generateIdParams = function(row, extraParams) {
                    var params = {};

                    for (var i in $scope.idMap) {
                        var map = $scope.idMap[i];

                        params[i] = $parse(map.substring(4))(row);
                    }

                    return generateParams($.extend(extraParams, params));
                };

                $scope.createPath = function(extraParams) {
                    extraParams = typeof(extraParams) == 'undefined' ? {} : extraParams;
                    return Routing.generate($scope.routes.create, generateParams(extraParams));
                };
                $scope.viewPath = function(row, extraParams) {
                    return Routing.generate($scope.routes.view, generateIdParams(row, extraParams));
                };
                $scope.editPath = function(row, extraParams) {
                    return Routing.generate($scope.routes.edit, generateIdParams(row, extraParams));
                };
                $scope.deletePath = function(row, extraParams) {
                    return Routing.generate($scope.routes.delete, generateIdParams(row, extraParams));
                };
                /**
                 * Return the correct (form || tr) template based on if we're editing the current row or just displaying it.
                 * @param row
                 * @returns {$scope.formTemplate||$scope.bodyTemplate}
                 */
                $scope.getRowTemplate = function(row) {
                    return $scope.editing.indexOf(row) > -1 || $scope.newRows.indexOf(row) > -1 ? $scope.formTemplate : $scope.bodyTemplate;
                };

                /**
                 * Mark a specific row for editing and copy the original data tot he $originalData array.
                 */
                $scope.edit = function(row) {
                    row.$originalData = {};
                    for (var i in row) {
                        if (i == '$originalData') {
                            continue;
                        }
                        row.$originalData[i] = row[i];
                    }
                    $scope.editing.push(row);
                };

                /**
                 * Add a new row to the 'newRows' array that will be used to render a new row in 'create' mode.
                 * @returns row just added
                 */
                $scope.create = function() {
                    var row = self.transform({});
                    $scope.newRows.push(row);
                    return row;
                };
                /**
                 * Cancel creating a new row.
                 * removes it from the newRows arraỵ
                 * @param row
                 */
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
                };

                /**
                 * Monitor the filter.value model so that data can be refreshed upon filtering.
                 */
                $scope.$watch('filter.value', function(newValue) {
                    var result = callDriver('filter', newValue);

                    if (angular.isObject(result) && 'then' in result) {
                        result.then(function() {
                            self.updateData();
                        });
                        return;
                    }
                    self.updateData();
                }, true);

                /**
                 * Catch 'row.updated' events, make sure that the row is transformed back to a read-only version
                 * of the form that it was in. Updates data afterwards.
                 */
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
                });

                $scope.$on('row.deleted', function(e, row) {
                    callDriver('deleteRow', row);
                    $scope.editing.splice($scope.editing.indexOf(row), 1);
                    self.updateData();
                });

                $scope.$on('row.deleting_failed', function(e, data) {
                    $scope.rowDeleteErrorMessage = data.errorMessage;
                });

                $scope.$watch(function() {
                    return getDriver().loading;
                }, function(val) {
                    $scope.loading = val;
                });

                $rootScope.$on('datagrid.refresh', function() {
                    console.log("Fetch new data! after datagrid.refresh!");
                    self.refresh();
                });

                $scope.$watch('firstResult + lastResult + filteredResults + totalResults', function() {
                    $scope.resultData = $interpolate(resultDataText)($scope);
                });
            }
        };
        return service;
    })

.directive('datagridRowClick', function($parse) {
    return {
        restrict: 'A',
        require: '^datagridRow',
        compile: function($element, $attr) {
            var fn = $parse($attr.datagridRowClick);
            return function($scope, $element, $attr) {
                $element.on('click', function(event) {
                    var elementsBetweenTargetAndHandler = $(event.target).parentsUntil($element).add($element);

                    if (elementsBetweenTargetAndHandler.filter('a, :input, [ng-click]').length) {
                        return;
                    }

                    $scope.$apply(function() {
                        fn($scope, {
                            $event: event
                        });
                    });
                });
            };
        }
    };
})

/**
 * Datagrid-row, bound to the dataservice's row for this specific page of the resultset.
 * Wraps the row in the current rowTemplate, make sure that the dataservice is set on it
 * Watches the template for the 'editing' attribute so that it can transform the element whenever needed
 * into the editor version of itself. Also adds errors to the tooltip when it finds them.
 */
.directive('datagridRow', function($compile, $templateCache, $http) {
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
                $http.get(newTemplateId, {
                    cache: $templateCache
                }).success(function(template) {
                    var $template = $(template);
                    $template.find('input[name], textarea[name], select[name]').each(function() {
                        $(this).attr('tooltip', '{{ errors["' + $(this).attr('name') + '"] }}').attr('tooltip-html', true);
                    });

                    $compile($template)($scope, function(clonedElement) {
                        iElement.empty().append(clonedElement);
                    });
                });
            });

        },
        controller: function($scope, $http, $injector, $rootScope) {
            $scope.hasErrors = false;

            var dataService = {};

            $scope.setDataService = function(dataservice) {
                dataService = $injector.get($scope.dataService);
            };

            $scope.delete = function(row) {
                if (!confirm('Are you sure you wish to delete this row?')) {
                    return;
                }

                $http.delete($scope.deletePath(row, {
                    _format: 'json'
                }), row).success(function() {
                    $scope.$emit('row.deleted', row);
                }).error( function(errorMessage, statusCode) {
                    $scope.hasErrors = true;
                    $rootScope.$broadcast('row.deleting_failed', {row: row, errorMessage: errorMessage, statusCode: statusCode});
                });
            };

            $scope.save = function(row) {
                var method;
                var url;

                if ($scope.isEditable(row)) {
                    method = 'put';
                    url = $scope.editPath(row, {
                        _format: 'json'
                    });
                } else {
                    method = 'post';
                    url = $scope.createPath({
                        _format: 'json'
                    });
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
                        data = {
                            errors: 'An error occurred while saving'
                        };
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
                            $scope.errors[i] += "<li>" + error + "</li>";
                        });
                        $scope.errors[i] += "</ul>";
                    }
                });
            };
        }
    };
})

/**
 * datagrid-errors directive
 *
 * Used when adding a new row to a datagrid to display errors.
 *
 * The datagrid-errors directive will show any validation errors. You could use Symfony's formview to generate this form,
 * but you'll still have to add the ng-model attribute to each field.
 *
 * Usage: @see doc/crud.md
 * `` <td><div datagrid-errors="modelProperty"></div> <input ng-model="row.modelProperty"></td>``
 */
.directive('datagridErrors', function() {
    return {
        restrict: 'A',
        require: '^datagridRow',
        scope: true,
        template: '<div ng-repeat="error in errors">{{ error }}</div>',
        link: function($scope, iElement, iAttr, datagrid) {
            $scope.errors = [];

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
            });
        }
    };
})

/**
 * Sortable directive for Datagrid columns.
 * Usage: `` <th sortable="billingCompany.name" class="sorting">Klant</th> ``
 * Fires the sort method on datagrid object when clicked, and updates the sort css class when
 * it changes.
 */
.directive('sortable', function() {
    return {
        restrict: 'A',
        require: '^datagrid',
        link: function($scope, iElement, iAttr, datagrid) {
            var name = iAttr.sortable || iAttr.text().toLowerCase();
            iElement.click(function() {
                $scope.$apply(function() {
                    datagrid.sort(name);
                });
            });

            $scope.$watch('sort', function(newValue) {
                if (typeof(newValue) != 'undefined') {
                    iElement.removeClass('sorting sorting-asc sorting-desc');

                    if (name == newValue[0]) {
                        iElement.addClass('sorting-' + newValue[1]);
                    } else {
                        iElement.addClass('sorting');
                    }
                } else {
                    iElement.addClass('sorting');
                }
            });
        }
    };
})

/**
 * Row click directive
 * Makes sure that you can use ctrl+click on a row to open a new window
 * Otherwise, the row-click directive automatically cancels the click event (when it detects a hyperlink
 * And navigates there via $window.location.
 * If the element is not a hyperlink, we passthrough the click event.
 */
.directive('rowClick', function($window) {
    return {
        restrict: 'A',
        link: function($scope, iElement, iAttr) {
            var $row = iElement.closest('tr');

            var action = function(e) {
                if (iElement.prop('tagName') == 'A' && !iAttr.dataDialog) {
                    if (e.which == 2 || e.ctrlKey) {
                        $window.open(iAttr.href);
                    } else {
                        $window.location.href = iAttr.href;
                    }
                } else {
                    iElement.trigger('click');
                }
            };

            $row
                .css('cursor', 'pointer')
                .on('click', function(e) {
                    if (!$(e.target).is('a') && !($(e.target).closest('a, input').length)) {
                        action(e);
                        e.preventDefault();
                    }
                });
        }
    };
})

/**
 * Single-input directive to change the filter value passed to the datagrid.
 * Mostly created so that the filterbox can be overridden.
 *
 * The filtervalue validates using ng-list so that you can add multiple search queries separated by a space.
 *
 * Example to overrride:
 * <script type='text/ng-template' id="filter-template.html">
 *     {{ icon('search', { size: '120%' }) }}
 *    <datagrid-filterbox class="filter"></datagrid-filterbox>
 * </script>
 *
 * > ngList: (Text input that converts between a delimited string and an array of strings.
 * > The default delimiter is a comma followed by a space - equivalent to ng-list=", ".
 * > You can specify a custom delimiter as the value of the ngList attribute - for example, ng-list=" | ".)
 */
.directive('datagridFilterbox', function() {
    return {
        restrict: 'E',
        replace: true,
        template: '<input type="text" ng-model="filter.value" ng-list="/\\s+/" autocapitalize="off">'
    };
});
