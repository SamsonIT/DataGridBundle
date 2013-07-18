angular.module('DataGrid').factory('datagrid.driver.knp-paginator', function($http, $q, $location) {
    var data;
    var filter = '';
    var filterTimeout;
    var filterFields;

    var getRouteParams = function(params) {
        var defaults = {};
        if (!angular.isArray(data.params)) {
            angular.copy(data.params, defaults);
        }
        params = angular.extend(defaults, params);
        if (!params[data.paginator_options.filterValueParameterName].length) {
            delete params[data.paginator_options.filterFieldParameterName];
            delete params[data.paginator_options.filterValueParameterName];
        }
        return params;
    }

    var generateRoute = function(routeName, params) {
        var params = angular.copy(params);
        params._format = 'json';
        return Routing.generate(routeName, params);
    }

    return {
        setData: function(newData) {
            console.log(newData);
            data = newData;
        },
        getVisibleRows: function() {
            return data.items;
        },
        getPage: function() {
            return data.current_page_number;
        },
        getPages: function() {
            var pages = [];
            for (var x = 1; x <= Math.ceil(data.total_count / data.num_items_per_page); x++) {
                pages.push(x);
            }
            return pages;
        },
        setFilterFields: function(newFilterFields) {
            filterFields = newFilterFields;
        },
        getFirstResult: function() {
            return (data.current_page_number - 1) * data.num_items_per_page + 1;
        },
        getLastResult: function() {
            var last = data.current_page_number * data.num_items_per_page;
            if (last > data.total_count) {
                last = data.total_count;
            }
            return last;
        },
        getTotalResults: function() {
            return data.total_count;
        },
        getFilteredResults: function() {
            return data.total_count;
        },
        getSort: function() {
            return [data.params.sort, data.params.direction];
        },
        setPage: function(page) {
            var deferred = $q.defer();
            var self = this;
            var pageParams = {};
            pageParams[data.paginator_options.pageParameterName] = page;
            var routeParams = getRouteParams(pageParams);

            $http.get(generateRoute(data.route, routeParams)).success(function(data) {
                self.setData(data);
                deferred.resolve();

                $location.search(routeParams).replace();
            });

            return deferred.promise;
        },
        sort: function(column) {
            var deferred = $q.defer();
            var self = this;
            var sortParams = {};
            sortParams[data.paginator_options.sortFieldParameterName] = column;
            sortParams[data.paginator_options.sortDirectionParameterName] = data.params.sort == column ? (data.params.direction == 'desc' ? 'asc' : 'desc') : 'asc';
            var routeParams = getRouteParams(sortParams);
            $http.get(generateRoute(data.route, routeParams)).success(function(data) {
                self.setData(data);
                deferred.resolve();

                $location.search(routeParams).replace();
            });

            return deferred.promise;
        },
        filter: function(newFilter) {
            if (typeof(newFilter) == 'undefined') {
                newFilter = '';
            }
            if (newFilter == filter) {
                return;
            }
            filter = newFilter;

            if (filterTimeout) {
                clearTimeout(filterTimeout);
            }

            var self = this;
            var deferred = $q.defer();

            filterTimeout = setTimeout(function() {
                var pageParams = {};
                pageParams[data.paginator_options.filterFieldParameterName] = filterFields;
                pageParams[data.paginator_options.filterValueParameterName] = filter;
                var routeParams = getRouteParams(pageParams);
                $http.get(generateRoute(data.route, routeParams)).success(function(data) {
                    self.setData(data);
                    deferred.resolve();

                    $location.search(routeParams).replace();
                });
            }, 200);

            return deferred.promise;
        }
    }
})