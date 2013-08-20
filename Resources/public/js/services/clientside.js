var drivers = drivers || {};
drivers['clientside'] = function($http, $q, $filter, $parse) {
    var data = [];
    var page = 1;
    var pages = [1];
    var itemsPerPage = 25;
    var sortField;
    var sortDir;
    var filter = [];

    var filteredRows;
    var visibleRows;
    var sortedRows;

    var firstResult;
    var lastResult;
    var totalResults;
    var filteredResults;

    var filterFields;

    var filterCallback = function(row) {
        for (var j in filter) {
            var value = filter[j].toLowerCase();
            var found = false
            for (var i in filterFields) {
                var field = $parse(filterFields[i])(row);
                if ( 'undefined' !== typeof(field) && field.toLowerCase().indexOf(value) > -1) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                return false;
            }
        }
        return true;
    }

    return {
        setData: function(newData, transformFn) {
            data = [];
            for (var i in newData) {
                data.push(transformFn(newData[i]));
            }

            this.update();
        },
        update: function() {
            var rows = data;

            if (filter) {
                filteredRows = $filter('filter')(rows, filterCallback);
            } else {
                filteredRows = rows;
            }

            if (sortField) {
                sortedRows = $filter('orderBy')(filteredRows, sortField, sortDir == 'desc');
            } else {
                sortedRows = filteredRows;
            }

            totalResults = data.length;
            filteredResults = filteredRows.length;

            pages = [];
            for (var x = 1; x <= Math.ceil(filteredRows.length / itemsPerPage); x++) {
                pages.push(x);
            }

            if (page > pages.length) {
                this.setPage(pages.length || 1);
            }

            this.updateVisible();
        },
        updateVisible: function() {
            visibleRows = sortedRows.slice((page - 1) * itemsPerPage, page * itemsPerPage);
            firstResult = sortedRows.indexOf(visibleRows[0]) + 1;
            lastResult = sortedRows.indexOf(visibleRows[visibleRows.length - 1]) + 1;
        },
        getVisibleRows: function() {
            return visibleRows;
        },
        getFirstResult: function() {
            return firstResult;
        },
        getLastResult: function() {
            return lastResult;
        },
        getTotalResults: function() {
            return totalResults;
        },
        getFilteredResults: function() {
            return filteredResults;
        },
        getPage: function() {
            return page;
        },
        getPages: function() {
            return pages;
        },
        setFilterFields: function(newFields) {
            filterFields = newFields;
        },
        setPage: function(newPage) {
            page = newPage;

            this.updateVisible();
        },
        filter: function(value) {
            filter = value;

            this.update();
        },
        sort: function(column) {
            if (sortField == column) {
                sortDir = sortDir == 'asc' ? 'desc' : 'asc';
            } else {
                sortField = column;
                sortDir = 'asc';
            }

            this.update();
        },
        getSort: function() {
            return [sortField, sortDir];
        },
        addRow: function(row, transformFn) {
            data.push(transformFn(row));
        },
        deleteRow: function(row) {
            data.splice(data.indexOf(row), 1);
            this.update();
        }
    }
};