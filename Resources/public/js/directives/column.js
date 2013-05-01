angular.module('DataGrid')
    .directive('column', function() {
        return {
            restrict: "E",
            template: '',
            replace: true,
            transclude: true,
            compile: function compile(tElement, tAttrs, transclude) {
                return {
                    pre: function preLink($scope, iElement, iAttrs) {
                        var column = {};
                        column.label = transclude($scope).text();
                        for (i in iAttrs.$attr) {
                            column[i] = iAttrs[i];
                        }
                        column.label = column.label || column.name;
                        $scope.addColumn(column);
                    }
                };
            }
        };
    })
;