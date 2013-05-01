angular.module('DataGrid')
    .directive('crud', function() {
        return {
            require: "^datagrid",
            restrict: "E",
            template: '',
            replace: true,
            transclude: true,
            compile: function compile(tElement, tAttrs, transclude) {
                return {
                    pre: function preLink($scope, iElement, iAttrs) {
                        $scope.actions = {};
                        transclude($scope);
                        
                        var getUrlParams = function(defaults, action) {
                            var params = { _format: 'html' };
                            if ($scope.actions[action].inline) {
                                params._format = 'json';
                            }
                            return angular.extend(params, defaults);
                        };
                        
                        $scope.generateEditUrl = function(route, row) {
                            if( !route ) { return }
                            return Routing.generate(route, getUrlParams({ id: row.data.id }, 'edit'));
                        };
                        
                        $scope.generateCreateUrl = function(route, row) {
                            if( !route ) { return }
                            return Routing.generate(route, getUrlParams({}, 'create'));
                        };
                        
                        $scope.generateDeleteUrl = function(route, row) {
                            if( !route ) { return }
                            return Routing.generate(route, getUrlParams({ id: row.data.id }, 'delete'));
                        };
                    }
                };
            },
            controller: function($scope, $http) {
                $scope.editRow = function(row, e) {
                    if ($scope.actions['edit'].inline) {
                        e.preventDefault();

                        $http.get($(e.target).attr('href')).success(function(data) {
                            $scope.loadForm(row, data);
                            row.form.action = $(e.target).attr('href');
                        });
                    }
                };
                $scope.createRow = function(e) {
                    if ($scope.actions['create'].inline) {
                        e.preventDefault();
                        var row = {new: true, data: {}};
                        $scope.rows.push(row);

                        $http.get($(e.target).attr('href')).success(function(data) {
                            $scope.loadForm(row, data);
                            row.form.action = $(e.target).attr('href');
                        });
                    }
                };
                $scope.deleteRow = function(row, e) {
                    if ($scope.actions['create'].inline) {
                        e.preventDefault();
                        
                        if ($scope.existingRows().indexOf(row) == -1) {
                            var index = $scope.rows.indexOf(row);
                            $scope.rows.splice(index, 1);
                            return;
                        }
                        
                        if (!confirm('Delete this row?')) {
                            return;
                        }
                        
                        $http.delete($(e.target).attr('href')).success(function(data) {
                            var index = $scope.rows.indexOf(row);
                            if (index < 0) {
                                throw Error('row not found in scope rows');
                            }
                            $scope.rows.splice(index, 1);
                        });
                    }
                };
                $scope.loadForm = function(row, data) {
                    row.form = {
                        widgets: {},
                        errors: data.errors
                
                    };
                    for (i in data.widgets) {
                        row.form.widgets[i] = {
                            widget: $("<div>").html(data.widgets[i].widget).text(),
                            error: data.widgets[i].error
                        };
                    }
                };
                $scope.saveRow = function(row, e) {
                    e.preventDefault();
                    var method = 'put';
                    if (row.new) {
                        method = 'post';
                    }
                    
                    var $tempForm = $("<form>");
                    var $row = $(e.target).closest('tr');
                    $row.find(':input').each(function() {
                        $tempForm.append($(this).clone());
                    });
                    $tempForm.append(row.form.widgets._token.widget);
                    
                    var config = {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    };
                    $http[method](row.form.action, $tempForm.serialize(), config).success(function(data) {
                        row.data = data;
                        delete row.form;
                    }).error(function(data, status) {
                        if (status == 400) {
                            $scope.loadForm(row, data);
                        }
                    });
                };
            }
        };
    })
;