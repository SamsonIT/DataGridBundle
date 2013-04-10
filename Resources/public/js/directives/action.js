angular.module('DataGrid')
    .directive('action', function() {
        return {
            restrict: "E",
            template: '',
            replace: true,
            transclude: true,
            compile: function compile(tElement, tAttrs, transclude) {
                return {
                    pre: function preLink($scope, iElement, iAttrs) {
                        var type = iAttrs.type;
                        var inline = typeof(iAttrs.inline) != 'undefined';
                        var route = transclude($scope).text();

                        $scope.actions[type] = {
                            route: route,
                            inline: inline
                        };
                    }
                };
            }
        };
    })
;