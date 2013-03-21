var DataGrid = Class.extend({
    rows: null,
    columns: null,
    allowEdit: false,
    editRoute: null,
    allowCreate: false,
    createRoute: null,
    allowDelete: false,
    deleteRoute: null,
    sortable: true,
    sorting: null,
    pageSize: null,
    page: null,
    filter: null,
    enableFilter: null,
    enablePageSizeSelector: null,
    currentPage: null,

    init: function(columns, data, options) {
        this.sorting = ko.observable({ column: null, inverse: false });
        
        this.inline = options.inline;
        this.allowEdit = options.allowEdit;
        this.editRoute = options.editRoute;
        this.allowCreate = options.allowCreate;
        this.createRoute = options.createRoute;
        this.allowDelete = options.allowDelete;
        this.deleteRoute = options.deleteRoute;
        this.sortable = options.sortable;
        this.pageSize = ko.observable(options.pageSize);
        this.filter = ko.observable();
        this.enableFilter = options.enableFilter;
        this.enablePageSizeSelector = options.enablePageSizeSelector;

        this.columns = ko.observableArray();
        for (i in columns) {
            columns[i].setGrid(this);
            this.columns.push(columns[i]);
        }
        this.page = ko.observable(options.page);
        
        this.rows = ko.observableArray();
        for (i in data) {
            var row = data[i];
            row.setGrid(this);
            this.rows.push(row);
        }

        this.existingRows = ko.computed(function() {
            return this.rows().filter(function(element) {
                return !element.isNew();
            }, this)
        }, this);
        this.newRows = ko.computed(function() {
            return this.rows().filter(function(element) {
                return element.isNew();
            }, this)
        }, this);
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
            
    createCreateUrl: function() {
        return Routing.generate(this.createRoute, { _format: this.inline ? 'json' : 'html' } );
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

DataGrid.Column = Class.extend({
    name: null,
    title: null,
    grid: null,
    classes: null,
    sortable: null,
    headCellTemplate: 'head-cell-template',
    bodyCellTemplate: 'body-cell-template',

    init: function(name, options) {
        this.name = name;
        
        var options = $.extend({
            title: name,
            sortable: true
        }, options, true);
        
        this.title = options.title;
        this.sortable = options.sortable;
    },
            
    setGrid: function(grid) {
        this.grid = grid;

        this.classes = ko.computed(function() {
            return {
                sortable: this.grid.sortable && this.sortable,
                sorting_asc: this.grid.sorting().column === this && this.grid.sorting().inverse === false,
                sorting_desc: this.grid.sorting().column === this && this.grid.sorting().inverse === true
            };
        }, this)
    },
            
    sort: function() {
        this.grid.sort(this);
    }
});

DataGrid.SingleIconColumn = DataGrid.Column.extend({
    icon: null,
    headCellTemplate: 'single-icon-head-cell-template',
    bodyCellTemplate: 'single-icon-body-cell-template',
    init: function(name, icon, options) {
        this._super(name, options);
        this.icon = icon;
        this.sortable = false;
    }
});

DataGrid.Row = Class.extend({
    grid: null,
    textData: null,
    formData: null,
    data: null,
    savingForm: null,
    errors: null,
    isNew: null,
            
    init: function(data) {
        this.textData = ko.observable(data);
        this.formData = ko.observable(null);
        this.data = ko.computed(function() {
            if (this.formData() === null) {
                return this.textData();
            }
            return this.formData();
        }, this);
        this.editing = ko.computed(function() {
            return this.formData() !== null;
        }, this);
        this.savingForm = ko.observable(false);
        this.errors = ko.observable(false);
        this.hiddenFields = ko.computed(function() {
            if (null === this.formData()) {
                return "";
            }
            var hiddenFields = "";
            for (i in this.formData()) {
                if (!(i in this.textData())) {
                    hiddenFields += this.formData()[i];
                }
            }
            return hiddenFields;
        }, this);
        this.isNew = ko.observable(false);
    },
            
    setGrid: function(grid) {
        this.grid = grid;
    },

    getColumnData: function(name) {
        if (name in this.data()) {
            return this.data()[name];
        }
        if (name in this.textData()) {
            return this.textData()[name];
        }
        //throw "The row data doesn't have a "+name+" field!";
        return '';
    },
    
    getSaveUrl: function() {
        return this.isNew() ? this.grid.createCreateUrl() : this.createEditUrl();
    },
            
    createEditUrl: function() {
        return Routing.generate(this.grid.editRoute, { id: this.getColumnData('id'), _format: this.grid.inline ? 'json' : 'html' } );
    },
    
    createDeleteUrl: function() {
        return Routing.generate(this.grid.deleteRoute, { id: this.getColumnData('id'), _format: 'json' } );
    },
            
            
    deleteRow: function() {
        var self = this;
        
        if (this.isNew()) {
            self.grid.rows.remove(self);
        } else {
            $.post(this.createDeleteUrl(), {}, function(data) {
                self.grid.rows.remove(self);
            });
        }
    },

    loadForm: function() {
        var self = this;
        $.get(this.getSaveUrl(), function(data) {
            self.createForm(data);
        });
    },

    createForm: function(data) {
        var formData = {};
        for (i in data.widgets) {
            formData[i] = $("<form>").html(data.widgets[i].error + data.widgets[i].widget).text();
        }
        this.formData(formData);
        if (data.errors) {
            this.errors($("<div>").html(data.errors).text());
        }
    },

    saveForm: function(row, event) {
        this.savingForm(true);
        this.errors(null);

        var $row = $(event.target).closest('tr');
        var self = this;
        var $form = $("<form>");
        $row.find(':input').each(function() {
            $form.append($(this).clone());
        });

        $.post(this.getSaveUrl(), $form.serialize(), function(data) {
            self.formData(null);
            self.savingForm(false);
            self.textData(data);
            
            self.isNew(false);
        }).fail(function(data) {
            if (data.status === 400) {
                self.savingForm(false);
                self.createForm($.parseJSON(data.responseText));
            }
        });
    }
});
