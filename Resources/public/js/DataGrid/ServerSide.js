DataGrid.ServerSide = DataGrid.extend({
    indexRoute: null,
    
    init: function(columns, pagination, options) {
        var options = $.extend({
            inline: true,
            allowEdit: false,
            editRoute: null,
            allowCreate: false,
            createRoute: null,
            allowDelete: false,
            deleteRoute: null,
            sortable: true,
            pageSize: 10,
            page: 1,
            enableFilter: true,
            enablePageSizeSelector: true
        }, options, true);
        
        this.indexRoute = pagination.route;
        this.totalResults = ko.observable(0);
        
        this._super(columns, [], options);
        this.pages = ko.observableArray([]);
        
        this.parsePagination(pagination);

        this.visibleRows = ko.computed(function() {
            return this.existingRows();
        }, this);

        this.resultsText = ko.computed(function() {
            var ret = ((this.page() - 1) * this.pageSize() + 1);
            ret += ' through ';
            
            var last = (this.page() * this.pageSize());
            if (last > this.totalResults()) {
                last = this.totalResults();
            }
            ret += last;
            
            ret += ' of ';
            ret += this.totalResults();
            ret += ' results displayed';

            return ret;
        }, this);

        var self = this;
        window.onpopstate = function(event) {
            self.loadResults(event.state, false);
        }
    },

    parsePagination: function(pagination) {
        if (!pagination.items.length) {
            return;
        }

        var pages = [];
        for (a = 0; a < Math.ceil(pagination.total_count / pagination.num_items_per_page); a++) {
            pages.push(a+1);
        }
        this.pages(pages);
        this.pageSize(pagination.num_items_per_page);
        this.totalResults(pagination.total_count);
        
        this.page(parseInt(pagination.current_page_number));
        if (pagination.params.sort) {
            for (i in this.columns()) {
                if (this.columns()[i].sortColumn == pagination.params.sort) {
                    this.sorting({ column: this.columns()[i], inverse: pagination.params.direction == 'desc' });
                }
            }
        } else {
            this.sorting({ column: null, inverse: false });
        }

        this.rows.removeAll();
        for (i in pagination.items) {
            this.rows.push(new DataGrid.Row(pagination.items[i]));
        }
    },

    setPage: function(page) {
        if (page < 1) {
            return;
        }
        this.loadResults({ page: page });
    },
            
    getUrlArguments: function(format) {
        return {
            _format: format || 'html',
            page: this.page(),
            sort: this.sorting().column ? this.sorting().column.sortColumn : null,
            direction: this.sorting().column ? (this.sorting().inverse ? 'desc' : 'asc') : null,
        }
    },
            
    loadResults: function(overrides, updateHistory) {
        if (typeof(updateHistory) == 'undefined') {
            updateHistory = true;
        }
        var arguments = $.extend(this.getUrlArguments('json'), overrides);
        
        var self = this;
        $.get(Routing.generate(self.indexRoute, arguments), function(data) {
            self.parsePagination(data);
            if (updateHistory) {
                history.pushState(self.getUrlArguments('json'), $("title").text(), Routing.generate(self.indexRoute, self.getUrlArguments()));
            }
        })
    },

    sort: function(column) {
        this.loadResults({ sort: column.sortColumn, direction: this.sorting().column == column ? (this.sorting().inverse ? 'asc' : 'desc') : 'asc' });
    }
});

DataGrid.ServerSide.Column = DataGrid.Column.extend({
    sortColumn: null,
    init: function(name, options) {
        options = $.extend({
            sort: null
        }, options, true);
        
        this._super(name, options);
        this.sortable = options.sort ? true : false;
        this.sortColumn = options.sort;
    },
    sort: function() {
        grid.sort(this);
    }
});