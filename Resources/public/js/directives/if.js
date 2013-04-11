/**
 * This file was copied from https://github.com/angular-ui/angular-ui/blob/master/modules/directives/if/if.js
 * and altered to our needs
 */
angular.module('DataGrid').directive('datagridIf', [function () {
  return {
    transclude: 'element',
    priority: 1000,
    terminal: true,
    restrict: 'A',
    compile: function (element, attr, transclude) {
      return function (scope, element, attr) {
        var childElement;
        var childScope;
 
        scope.$watch(attr['datagridIf'], function (newValue) {
          if (childElement) {
            childElement.remove();
            childElement = undefined;
          }
          if (childScope) {
            childScope.$destroy();
            childScope = undefined;
          }

          if (newValue) {
            childScope = scope.$new();
            transclude(childScope, function (clone) {
              childElement = clone;
              element.after(clone);
            });
          }
        });
      };
    }
  };
}]);