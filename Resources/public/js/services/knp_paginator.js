var drivers = drivers || {};
drivers['knp-paginator'] = function ($http, $q, $location, $timeout) {
    var data = [],
        filter = '',
        filterTimeout,
        filterFields,

        /**
         * Cancel any outstanding active requests if they're active.
         * To prevent hammering the server with quick user-interactions with the interface.
         */
        abortActiveRequest = function () {
            if (filterTimeout) {
                $timeout.cancel(filterTimeout);
                filterTimeout = null;
            }
        },

        /**
         * Check if the option paginator_options.filterValueParameterName exists in the passed params array
         * and send that back if no default route parameters have been set.
         *
         * @param object params KNPPaginator options.
         */

        getRouteParams = function (params) {
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
        },

        /**
         * Dependency to routing.generate for creating a route.
         * Overwrite when needed.
         * @param routeName string
         * @param params object
         * @returns {string|*}
         */
        generateRoute = function (routeName, params) {
            params = angular.copy(params);
            params._format = 'json';
            return Routing.generate(routeName, params);
        },

        service = {
            loading: false,

            /**
             * Store the new data locally
             * optionally add a transform function to map between server-side data and what the client expects.
             * @param newData array with objects of new data.
             * @param transformFn
             */
            setData: function (newData, transformFn) {
                for (var i in newData.items) {
                    newData.items[i] = transformFn(newData.items[i]);
                }
                data = newData;
                data.transformFn = transformFn;
            },
            /**
             * Return all items that were fetched.
             * @returns array
             */
            getVisibleRows: function () {
                return data.items;
            },
            /**
             * Return current page number
             * @returns int
             */
            getPage: function () {
                return parseInt(data.current_page_number);
            },
            /**
             * Fetch an array of page numbers.
             * @returns array with one item for each page number.
             */
            getPages: function () {
                var pages = [];
                for (var x = 1; x <= Math.ceil(data.total_count / data.num_items_per_page); x++) {
                    pages.push(x);
                }
                return pages;
            },
            /**
             * Store new filter fields in the adapter.
             * @param newFilterFields
             */
            setFilterFields: function (newFilterFields) {
                filterFields = newFilterFields;
            },
            /**
             * Get the amount of items on the first page.
             * @returns {number}
             */
            getFirstResult: function () {
                return (data.current_page_number - 1) * data.num_items_per_page + 1;
            },
            /**
             * Calculate the amount of items on the last page.
             * @returns {number}
             */
            getLastResult: function () {
                var last = data.current_page_number * data.num_items_per_page;
                if (last > data.total_count) {
                    last = data.total_count;
                }
                return last;
            },
            /**
             * Return total number of items
             * @returns {number}
             */
            getTotalResults: function () {
                return data.total_count;
            },
            /**
             * Return total number of items
             * @returns {number}
             */
            getFilteredResults: function () {
                return data.total_count;
            },

            /**
             * Return the default sort field and direction
             * @returns array with 2 items: [sortfield, sortdirection]
             */
            getSort: function () {
                return [data.params.sort, data.params.direction];
            },
            /**
             * Notify the server that we want to fetch a new page of data.
             *
             * @param page page number to switch to
             * @returns Promise to fetch new data
             */
            setPage: function (page) {
                if (page < 1) {
                    page = 1;
                }
                page = Math.min(Math.max(1, page), this.getPages().length);

                var self = this;
                var pageParams = {};
                pageParams[data.paginator_options.pageParameterName] = page;
                var routeParams = getRouteParams(pageParams);

                this.loading = true;
                abortActiveRequest(); // abort $cancelRequest if running and create a new $cancelRequest.

                var p = $q.defer();
                return $http.get(generateRoute(data.route, routeParams)).then(function (response) {
                    var newData = response.data;
                    self.loading = false;
                    self.setData(newData, data.transformFn);

                    $location.search(routeParams).replace();
                    return newData;
                }, function () {
                    self.loading = false;
                });
            },

            /**
             * Execute a server-side sort on a column and return the paged data
             * @param column column to sort on. Will sort reverse when re-invoked.
             * @returns Promise new HTTP request executing.
             */
            sort: function (column) {
                var self = this;
                var sortParams = {};
                sortParams[data.paginator_options.sortFieldParameterName] = column;
                sortParams[data.paginator_options.sortDirectionParameterName] = data.params.sort == column ? (data.params.direction == 'desc' ? 'asc' : 'desc') : 'asc';
                var routeParams = getRouteParams(sortParams);

                this.loading = true;
                abortActiveRequest();

                var p = $q.defer();
                filterTimeout = $timeout(function () {
                    $http.get(generateRoute(data.route, routeParams)).success(function (newData) {
                        self.loading = false;
                        self.setData(newData, data.transformFn);
                        p.resolve();
                        $location.search(routeParams).replace();
                    });
                }, 250)

                return p.promise;
            },

            /**
             * Execute the new filter request.
             * @param newFilter
             * @returns {Promise}
             */
            filter: function (newFilter) {
                if (typeof(newFilter) == 'undefined') {
                    newFilter = '';
                }
                if (newFilter == filter) {
                    return;
                }
                filter = newFilter;
                var self = this;
                var pageParams = {};
                pageParams[data.paginator_options.filterFieldParameterName] = filterFields;
                pageParams[data.paginator_options.filterValueParameterName] = filter;
                abortActiveRequest();

                var routeParams = getRouteParams(pageParams);
                self.loading = true;

                var p = $q.defer();
                filterTimeout = $timeout(function () {
                    $http.get(generateRoute(data.route, routeParams)).success(function (newData) {
                        self.loading = false;
                        self.setData(newData, data.transformFn);
                        $location.search(routeParams).replace();
                        p.resolve();
                    });
                }, 250);

                return p.promise;
            },

            /**
             * For updating the current view, we re-set the page to this.getPage() to trigger a refresh.
             */
            update: function () {
                this.setPage(this.getPage());
            },
            /**
             * After adding a row, refresh the dataset for the page from server.
             * Note that our freshly added row could disappear after a re fresh, but that's due to sorting / pagination..
             * @param row
             * @param transformFn
             */
            addRow: function (row, transformFn) {
                row = transformFn(row);
                data.items.push(row);
                this.update();
                return row;
            },
            /**
             * Remove the deleted row from the current view and then fire an update data request to fetch the new view data.
             * @param row
             */
            deleteRow: function (row) {
                data.items.splice(data.items.indexOf(row), 1);
                this.update();
            }
        };
    return service;
};
