angular.module('DataGrid')
    .directive('columns', function() {
        return {
            require: "^datagrid",
            restrict: "E",
            template: '',
            replace: true,
            transclude: true,
            compile: function compile(tElement, tAttrs, transclude) {
                return {
                    pre: function preLink($scope) {
                        transclude($scope);
                    }
                };
            }
        };
    })
;