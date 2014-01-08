'use strict';

angular.module('vd.multi_route', [])
  .provider('$route', MultiRouteProvider);


/**
 * @ngdoc object
 * @name ng.$routeProvider
 * @function
 *
 * @description
 *
 * Used for configuring routes. See {@link ng.$route $route} for an example.
 */

function inherit(parent, extra) {
  return angular.extend(new (angular.extend(function() {}, {prototype:parent}))(), extra);
}

function MultiRouteProvider() {
  var routes = {};
  var config = {};

  this.when = function(path, route) {
  
   var execute = function(oldRouteInfo, newRouteInfo) {
      return !oldRouteInfo || !newRouteInfo || oldRouteInfo.id != newRouteInfo.id;
    };

    if( route.controllers ) {
      var time = new Date().getTime();
      angular.forEach(route.controllers, function(controller, index) {
        controller.id = controller.id ? controller.id : (time + index);
        controller.execute = controller.execute ? controller.execute : execute;
      });
    }

    routes[path] = angular.extend({reloadOnSearch: true}, route);

    // create redirection for trailing slashes
    if (path) {
      var redirectPath = (path[path.length-1] == '/')
          ? path.substr(0, path.length-1)
          : path +'/';

      routes[redirectPath] = {redirectTo: path};
    }

    return this;
  };

  /**
   * @ngdoc method
   * @name ng.$routeProvider#otherwise
   * @methodOf ng.$routeProvider
   *
   * @description
   * Sets route definition that will be used on route change when no other route definition
   * is matched.
   *
   * @param {Object} params Mapping information to be assigned to `$route.current`.
   * @returns {Object} self
   */
  this.otherwise = function(params) {
    this.when(null, params);
    return this;
  };
  
  this.config = function(params) {
    config = angular.extend(params, config);
    return this;
  }

  this.$get = ['$rootScope', '$location', '$routeParams', '$q', '$injector', '$http', '$templateCache', '$interpolate',
      function( $rootScope,   $location,   $routeParams,   $q,   $injector,   $http,   $templateCache, $interpolate) {
    var matcher = switchRouteMatcher,
        forceReload = false,
        $route = {
          routes: routes,

          /**
           * @ngdoc method
           * @name ng.$route#reload
           * @methodOf ng.$route
           *
           * @description
           * Causes `$route` service to reload the current route even if
           * {@link ng.$location $location} hasn't changed.
           *
           * As a result of that, {@link ng.directive:ngView ngView}
           * creates new scope, reinstantiates the controller.
           */
          reload: function() {
            forceReload = true;
            $rootScope.$evalAsync(updateRoute);
          }
        };
    
    $rootScope.$on('$locationChangeSuccess', updateRoute);

    return $route;

    /////////////////////////////////////////////////////

    function switchRouteMatcher(on, when, defaultParameters) {
      // TODO(i): this code is convoluted and inefficient, we should construct the route matching
      //   regex only once and then reuse it
      /*var regex = '^' + when.replace(/([\.\\\(\)\^\$])/g, "\\$1") + '$',
          params = [],
          dst = {};
      angular.forEach(when.split(/\W/), function(param) {
        if (param) {
          var paramRegExp = new RegExp(":" + param + "([\\W])");
          if (regex.match(paramRegExp)) {
            regex = regex.replace(paramRegExp, "([^\\/]*)$1");
            params.push(param);
          }
        }
      });
      var match = on.match(new RegExp(regex));
      if (match) {
        angular.forEach(params, function(name, index) {
          dst[name] = match[index + 1];
        });
      }
      return match ? dst : null;*/
      //console.log('switchRouteMatcher ', on, when)
      var regex = '^' + when.replace(/([\.\\\(\)\^\$])/g, "\\$1") + '$',
      params = [],
      dst = {};
      //var matches = when.match(/(:([a-zA-Z0-9\-_\.]+)(\{[^}]+\})?)+/g);
      //console.log('matches : ', matches)
      angular.forEach(when.split(/\W/), function(param) {
        if (param) {
          var paramRegExp = new RegExp(":" + param + "(?:\{([^}]+)\})?([\\W])");
          var matches = regex.match(paramRegExp);
          if (matches) {
            regex = regex.replace(paramRegExp, "([^\\/]*)$2");
            params.push({ name: param, default_value: matches[1]});
          }
        }
      });

      var match = on.match(new RegExp(regex));
      if (match) {
        angular.forEach(params, function(param, index) {
          dst[param.name] = (match[index+1]) ? match[index+1] : param.default_value;
        });
      }

      return match ? angular.extend(dst, defaultParameters || []) : null;
    }

    function updateRoute() {
      var next = parseRoute(),
          last = $route.current;
      if (next && last && next.$route === last.$route
          && angular.equals(next.pathParams, last.pathParams) && !next.reloadOnSearch && !forceReload) {
        last.params = next.params;
        angular.copy(last.params, $routeParams);
        $rootScope.$broadcast('$routeUpdate', last);
      } else if (next || last) {
        forceReload = false;
        $rootScope.$broadcast('$routeChangeStart', next, last);
        $route.current = next;
        if (next) {
          if (next.redirectTo) {
            if (angular.isString(next.redirectTo)) {
              $location.path(interpolate(next.redirectTo, next.params)).search(next.params)
                       .replace();
            } else {
              $location.url(next.redirectTo(next.pathParams, $location.path(), $location.search()))
                       .replace();
            }
          }
        }

        $q.when(next).
          then(function() {
            if (next) {
              if (angular.isUndefined(next.controllers)) {
                var keys = [],
                    values = [],
                    template;
                    
                angular.forEach(next.resolve || {}, function(value, key) {
                  keys.push(key);
                  values.push(isFunction(value) ? $injector.invoke(value) : $injector.get(value));
                });
                if (angular.isDefined(template = next.template)) {
                } else if (angular.isDefined(template = next.templateUrl)) {
                  template = $http.get(template, {cache: $templateCache}).
                      then(function(response) { return response.data; });
                }
                if (angular.isDefined(template)) {
                  keys.push('$template');
                  values.push(template);
                }
                return $q.all(values).then(function(values) {
                  var locals = {};
                  angular.forEach(values, function(value, index) {
                    locals[keys[index]] = value;
                  });
                  return locals;
                });
              } else {
                
                var locals = [], keys = [], values = [], template;
                
                var loadingTemplate;
                
                if (angular.isDefined(loadingTemplate = config.loadingTemplate)) {
                } else if (angular.isDefined(loadingTemplate = config.loadingTemplateUrl)) {
                  loadingTemplate = $http.get(loadingTemplate, {cache: $templateCache}).
                      then(function(response) { return $interpolate(response.data); });
                }
                
                if (angular.isDefined(loadingTemplate)) {
                    keys.push('global:$loadingTemplate');
                    values.push(loadingTemplate);
                }
                
                angular.forEach(next.controllers, function(value, key) {
                  
                  locals[key] = {};
                  
                  angular.forEach(value.resolve || {}, function(resolveValue, resolveKey) {
                    keys.push(key+':'+resolveKey);
                    values.push(angular.isFunction(resolveValue) ? $injector.invoke(resolveValue) : $injector.get(resolveValue));
                  });
          
          
          
                  if (angular.isDefined(template = value.template)) {
                  } else if (angular.isDefined(template = value.templateUrl)) {
                    /*template = $http.get(template, {cache: $templateCache}).
                      then(function(response) { return response.data; });*/
                  }
                  
                  if (angular.isDefined(template)) {
                    keys.push(key+':$template');
                    values.push(template);
                  }
                });

                return $q.all(values).then(function(values) {
                  var locals = [];
                  
                  angular.forEach(values, function(value, index) {
                    var key_infos = keys[index].split(':');
                    
                    if( angular.isUndefined(locals[key_infos[0]]) ) {
                      locals[key_infos[0]] = {};
                    }
                    locals[key_infos[0]][key_infos[1]] = value;
                  });
                  return locals;
                });
                
              }
              
            }
          }).
          // after route change
          then(function(locals) {
            if (next == $route.current) {
              if (angular.isDefined(locals) && angular.isDefined(next.controllers)) {
                
                angular.forEach(next.controllers, function(controller, index) {
                  next.controllers[index].locals = angular.extend(locals[index], locals['global'], {});
                })

                if (next) {
                    angular.copy(next.params, $routeParams);
                }

                //if( $location.$$fireLocationChange ) {
                  $rootScope.$broadcast('$routeChangeSuccess', next, last);
                /*} else {
                  $location.$$fireLocationChange = true;
                }*/
                
              } else {
                if (next == $route.current) {
                  if (next) {
                    next.locals = locals;
                    angular.copy(next.params, $routeParams);
                  }

                  //if( $location.$$fireLocationChange ) {
                    $rootScope.$broadcast('$routeChangeSuccess', next, last);
                  /*} else {
                    $location.$$fireLocationChange = true;
                  }*/
                }
              }
            }
          }, function(error) {
            if (next == $route.current) {
              $rootScope.$broadcast('$routeChangeError', next, last, error);
            }
          });
      }
    }

    /**
     * @returns the current active route, by matching it against the URL
     */
    function parseRoute() {
      // Match a route
      var params, match;
      angular.forEach(routes, function(route, path) {
        if (!match && (params = matcher($location.path(), path, route.parameters))) {
          match = inherit(route, {
            params: angular.extend({}, $location.search(), params),
            pathParams: params});
          match.$route = route;
        }
      });
      // No route matched; fallback to "otherwise" route
      return match || routes[null] && inherit(routes[null], {params: {}, pathParams:{}});
    }

    /**
     * @returns interpolation of the redirect path with the parametrs
     */
    function interpolate(string, params) {
      var result = [];
      angular.forEach((string||'').split(':'), function(segment, i) {
        if (i == 0) {
          result.push(segment);
        } else {
          var segmentMatch = segment.match(/(\w+)(.*)/);
          var key = segmentMatch[1];
          result.push(params[key]);
          result.push(segmentMatch[2] || '');
          delete params[key];
        }
      });
      return result.join('');
    }
  }];
}
