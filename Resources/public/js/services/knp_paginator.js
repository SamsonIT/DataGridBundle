var drivers = drivers || {};

drivers['knp-paginator'] = function ($http, $q, $location, $timeout) {
    var data = [],
        filter = '',
        filterTimeout,
        filterFields,
        $cancelRequest = null,

        /**
         * Cancel any outstanding active requests if they're active.
         * To prevent hammering the server with quick user-interactions with the interface.
         */
        abortActiveRequest = function() {
            if ($cancelRequest !== null && ('resolve' in $cancelRequest)) {
                $cancelRequest.resolve(); // reject promise timeout for previous page loads so that it aborts.
            }
            $cancelRequest = $q.defer();
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

            if (data.paginator_options && (!(data.paginator_options.filterValueParameterName in params) || !params[data.paginator_options.filterValueParameterName].length)) {
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
            var params = angular.copy(params);
            params._format = 'json';
            return Routing.generate(routeName, params);
        },

        /**
         * Check if there is a form with class .form-contents and input's with name filter[*
         * Return a hashmap of the values of those when the form doesn't have the class .filter-hidden
         * @returns false || object
         */
        getSearchParams = function () {
            var params = document.querySelectorAll(".form-contents:not(.filter-hidden) [name^='filter[']");
            if(params.length > 0) {
                var filters = {};
                Array.prototype.map.call(params, function (param) {
                    if (param.name.indexOf('[reset]') > -1) {
                        return;
                    }
                    filters[param.name] = param.value;
                });
                return filters;
            }
            return false;
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
             * Return either the default sort field and direction or custom sort and direction passed to knpPaginator
             * @returns array with 2 items: [sortfield, sortdirection]
             */
            getSort: function (col) {
                return 'params' in data && (data.paginator_options.sortFieldParameterName in data.params) && (data.paginator_options.sortDirectionParameterName in data.params) ? [data.params[data.paginator_options.sortFieldParameterName], data.params[data.paginator_options.sortDirectionParameterName]] : [];
            },

            /**
             * Standard interface to fetch paged data.
             * Automagically joins the sort and search parameters, aborts the previous request,
             * generates the route for the parameter and executes the request.
             *
             * @param parameters {} || null;
             * @returns Promise active new request.
             */
            fetchPagedData : function(parameters) {

                if(!data.route) return;

                if(!parameters) {
                    parameters = {};
                }

                /// toodo finish this:. default should be sensible.
                if(('sortFieldParameterName' in data.paginator_options) && (data.paginator_options.sortFieldParameterName in data.params)) {
                    parameters[data.paginator_options.sortFieldParameterName] = data.params[data.paginator_options.sortFieldParameterName];
                }
                if('defaultSortFieldDirection' in data.paginator_options && (data.paginator_options.sortFieldParameterName in data.params)) {
                    parameters[data.paginator_options.defaultSortFieldDirection] = data.params[data.paginator_options.defaultSortFieldDirection];
                }
                parameters[data.paginator_options.sortDirectionParameterName] = data.params.direction || 'asc';
                parameters[data.paginator_options.pageParameterName] = parameters.page || 1;

                abortActiveRequest(); // abort $cancelRequest if running and create a new $cancelRequest.

                var routeParams = getRouteParams(parameters),
                    searchParams = getSearchParams();

                service.loading = true;

                return $http({
                    method: searchParams !== false ? 'POST' : 'GET',
                    url: generateRoute(data.route, routeParams),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: $cancelRequest.promise,
                    transformRequest: function(obj, a, b) {
                        var str = [];
                        for(var p in obj) {
                            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                        }
                        return str.join("&");
                    },
                    data: !searchParams ? null : searchParams
                }).success(function (newData) {
                    service.loading = false;
                    service.setData(newData, data.transformFn);
                    $location.search(routeParams).replace();
                    return newData;
                });

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


                var pageParams = {};
                pageParams[data.paginator_options.pageParameterName] = page;
                return service.fetchPagedData(pageParams);
            },
            /**
             * Execute a server-side sort on a column and return the paged data
             * @param column column to sort on. Will sort reverse when re-invoked.
             * @returns Promise new HTTP request executing.
             */
            sort: function (column) {
                data.params[data.paginator_options.sortDirectionParameterName] = data.params[data.paginator_options.sortFieldParameterName] == column ? (data.params[data.paginator_options.sortDirectionParameterName] == 'desc' ? 'asc' : 'desc') : 'asc';
                data.params[data.paginator_options.sortFieldParameterName] = column;
                return service.fetchPagedData();
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

                if (filterTimeout) {
                    $timeout.cancel(filterTimeout);
                }

                var pageParams = getRouteParams({});
                    pageParams[data.paginator_options.filterFieldParameterName] = filterFields;
                    pageParams[data.paginator_options.filterValueParameterName] = filter;
                return service.fetchPagedData();
            },
            /**
             * For updating the current view, we re-set the page to this.getPage() to trigger a refresh.
             * @param row
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
}