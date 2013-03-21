DataGrid.ClientSide = DataGrid.extend({
    
    init: function(columns, data, options) {
        var options = $.extend({
            inline: true,
            allowEdit: false,
            editRoute: null,
            allowCreate: false,
            createRoute: null,
            allowDelete: false,
            deleteRoute: null,
            sortable: true,
            pageSize: DataGrid.defaults.pageSize,
            page: 1,
            enableFilter: true,
            enablePageSizeSelector: false
        }, options, true);
        
        this._super(columns, data, options);

        this.currentPage = ko.observable(options.page);
        
        this.filteredRows = ko.computed(function() {
            if (!this.filter()) {
                return this.existingRows();
            }
            
            var filteredRows = [];
            for (i in this.existingRows()) {
                var row = this.existingRows()[i];
                for (j in this.columns()) {
                    var column = this.columns()[j];
                    var value = row.textData()[column.name];
                    if (!value) {
                        continue;
                    }

                    if (value.toString().toLowerCase().indexOf(this.filter().toLowerCase()) > -1) {
                        filteredRows.push(row);
                        break;
                    }
                }
            }
            
            return filteredRows;
        }, this);
        
        this.pages = ko.computed(function() {
            var pages = [];
            for (a = 1; a <= Math.ceil(this.filteredRows().length / this.pageSize()); a++) {
                pages.push(a);
            }
            return pages;
        }, this);
        
        this.page = ko.computed({
            read: function() {
                if (this.currentPage() > this.pages().length) {
                    this.currentPage(this.pages().length);
                }
                if (this.currentPage() < 1) {
                    this.currentPage(1);
                }
                if (this.currentPage() * this.pageSize() > this.filteredRows().length) {
                    this.currentPage(Math.ceil(this.filteredRows().length / this.pageSize()));
                }
                return this.currentPage();
            },
            write: function(value) {
                this.currentPage(value);
            },
            owner: this
        });

        this.visibleRows = ko.computed(function() {
            return this.filteredRows().slice((this.page() - 1) * this.pageSize(), (this.page() * this.pageSize()));
        }, this);

        this.resultsText = ko.computed(function() {
            var ret = ((this.page() - 1) * this.pageSize() + 1);
            ret += ' through ';
            
            var last = (this.page() * this.pageSize());
            if (last > this.filteredRows().length) {
                last = this.filteredRows().length;
            }
            ret += last;
            
            ret += ' of ';
            ret += this.filteredRows().length;
            ret += ' results displayed (total: ' + this.rows().length + ')';
            
            return ret;
        }, this);
    },
            
    setPage: function(page) {
        this.page(page);
    },

    loadCreateForm: function() {
        var data = {};
        for (i in this.columns()) {
            data[this.columns()[i].name] = "";
        }
        var row = new Row(data);
        row.setGrid(this);
        row.isNew(true);
        $.get(row.getSaveUrl(), function(data) {
            row.createForm(data);
        });

        this.rows.push(row);
    },

    sort: function(column) {
        if (!this.sortable || !column.sortable) {
            return;
        }

        this.sorting({ column: column, inverse: this.sorting().column === column ? !this.sorting().inverse : false });

        var self = this;
        this.rows.sort(function(a, b) {
            var ret = 0;
            
            if (a.textData()[self.sorting().column.name] > b.textData()[self.sorting().column.name]) {
                ret = 1;
            } else if (a.textData()[self.sorting().column.name] < b.textData()[self.sorting().column.name]) {
                ret = -1;
            }
            
            if (self.sorting().inverse) {
                ret *= -1;
            }
            
            return ret;
        });
    }
});