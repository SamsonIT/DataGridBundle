var drivers = drivers || {};
drivers['knp-paginator'] = function($http, $q, $location, $timeout) {
    var data = [];
    var filter = '';
    var filterTimeout;
    var filterFields;

    var getRouteParams = function(params) {
        var defaults = {};
        if (!angular.isArray(data.params)) {
            angular.copy(data.params, defaults);
        }
        params = angular.extend(defaults, params);
        if (!(data.paginator_options.filterValueParameterName in params) || !params[data.paginator_options.filterValueParameterName].length) {
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
        loading: false,

        setData: function(newData, transformFn) {
            for (var i in newData.items) {
                newData.items[i] = transformFn(newData.items[i]);
            }
            data = newData;
            data.transformFn = transformFn;
        },
        getVisibleRows: function() {
            return data.items;
        },
        getPage: function() {
            return parseInt(data.current_page_number);
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
            if (page < 1) {
                page = 1;
            }
            page = Math.min(Math.max(1, page), this.getPages().length);

            var deferred = $q.defer();
            var self = this;
            var pageParams = {};
            pageParams[data.paginator_options.pageParameterName] = page;
            var routeParams = getRouteParams(pageParams);

            this.loading = true;
            $http.get(generateRoute(data.route, routeParams)).success(function(newData) {
                self.loading = false;
                self.setData(newData, data.transformFn);
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
            this.loading = true;
            $http.get(generateRoute(data.route, routeParams)).success(function(newData) {
                self.loading = false;
                self.setData(newData, data.transformFn);
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
                $timeout.cancel(filterTimeout);
            }

            var self = this;
            var deferred = $q.defer();

            filterTimeout = $timeout(function() {
                var pageParams = {};
                pageParams[data.paginator_options.filterFieldParameterName] = filterFields;
                pageParams[data.paginator_options.filterValueParameterName] = filter;
                var routeParams = getRouteParams(pageParams);
                self.loading = true;
                $http.get(generateRoute(data.route, routeParams)).success(function(newData) {
                    self.loading = false;
                    self.setData(newData, data.transformFn);
                    deferred.resolve();

                    $location.search(routeParams).replace();
                });
            }, 200);

            return deferred.promise;
        },
        /**
         * For updating the current view, we re-set the page to this.getPage() to trigger a refresh.
         * @param row
         */
        update: function() {
            this.setPage(this.getPage());
        },
        /**
         * After adding a row, refresh the dataset for the page from server.
         * Note that our freshly added row could disappear after a re fresh, but that's due to sorting / pagination..
         * @param row
         * @param transformFn
         */
        addRow: function(row, transformFn) {
            row = transformFn(row);
            data.items.push(row);
            this.update();
            return row;
        },
        /**
         * Remove the deleted row from the current view and then fire an update data request to fetch the new view data.
         * @param row
         */
        deleteRow: function(row) {
           data.items.splice(data.items.indexOf(row), 1);
           this.update();
        }
    }
}