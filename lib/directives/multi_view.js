'use strict';

/**
 * @ngdoc directive
 * @name directive:multiView
 * @restrict ECA
 * @author Vincent Dieltiens
 
 * @description
 * # Overview
 * `multiView` is a directive that complements the {@link MultiRoute $route} service by
 * including the rendered template of the current route into the main layout (`index.html`) file.
 * Every time the current route changes, the included view changes with it according to the
 * configuration of the `$route` service.
 *
 * @scope
 * @example
    <example module="multiView">
    </example>
 */

angular.module('vd.multi_view', []).
	directive('vdMultiView', ['$http', '$templateCache', '$route', '$anchorScroll', '$compile',
	                        '$controller', '$rootScope', '$routeParams', '$injector', '$q',  
	           function($http,   $templateCache,   $route,   $anchorScroll,   $compile,
	                    $controller, $rootScope, $routeParams, $injector, $q) {
		return {
			restrict: 'ECA',
			terminal: true,
			scope: {
				persist: '@persist'
			},
			link: function(scope, element, attr) {
				var lastScope,
				    onloadExp = attr.onload || '',
				    lastController = null;
	
			// Updates the view when the route change or at initialisation of the directive
			scope.$on('$routeChangeSuccess', update);
			update();
	
			/**
			 * Destory the last scope.
			 */
			function destroyLastScope() {	
				if (lastScope) {
					lastScope.$destroy();
					lastScope = null;
				}
			}
	
			/**
			 * Cleat the content of the directive element and destory the related scope
			 */
			function clearContent() {
				element.html('');
				element.data('oldRouteInfo', null);
				element.data('persist', null);
				destroyLastScope();
			}
	
			/**
			 * Update the view according to the $route informations.
			 */
			function update() {
				
				
				var controllers = $route.current && $route.current['$route'] && $route.current['$route'].controllers,
				    locals = null,
				    template = null,
				    params = $route.current && $route.current.params,
				    controller = {};
				
				if (controllers) {
	
					// Searching for the controller related to this view
					var controller_found = false;
					var execute = false;
	
					angular.forEach($route.current['$route'].controllers, function(_controller, index) {
	
						if (_controller.view != attr.vdMultiView) {
							return false;
						}
						
						controller_found = true;
						_controller.params = params;
	
						var data = {
							id: _controller.id,
							params: params
						};
	    
	            		if (_controller.execute && angular.isFunction(_controller.execute)) {
							execute = _controller.execute(element.data('oldRouteInfo'), data);
						} else {
							execute = true;
						}
						
						// If persist function is defined in the route, save if for later.
						// When there is no more controller for this wiew, we will call this func to
						// know if we must the content of this view
						if (_controller.persist && angular.isFunction(_controller.persist)) {
							element.data('persist', _controller.persist);
						}
						
						// Save the old route information
						if ($route.current) {
							element.data('oldRouteInfo', data);
						}
	
						locals = _controller.locals;
						//template = locals && locals.$template;
						controller = _controller.controller;
						lastController = controller;
						
						if (_controller.template) {
							template = _controller.template;
						} else if (_controller.templateUrl) {
							template = $http.get(_controller.templateUrl, {cache: $templateCache}).
                      			then(function(response) { return response.data; });
						}
						
						return false;
					});
	
					var persist = element.data('persist');
					var data = {
						id: null,
						params: params
					};
					
					// If there is no controller related to this view, we check if we must clear the content (persist = false) or not (persist = true)
					if( !controller_found ) {
						
						// Clear the content in case of :
						// - there is no 'persist' function defined in the route controller definition
						// - the 'persist' function return false
						if (persist  && !persist(element.data('oldRouteInfo'), data) ) {
							clearContent();
							return;
						}
					}
	
					// Stop execution if we doesn't must execute the controller and the template
					if (!execute) {
						return;
					}
				} else {
					// Support the Angularjs ng.$route syntaxt with one controller
					locals = $route.current && $route.current.locals,
					template = locals && locals.$template;
					controller = $route.current && $route.current.controller;
					
					var persist = element.data('persist');
					var data = {
						id: null,
						params: params
					};
					if (persist  && !persist(element.data('oldRouteInfo'), data) ) {
						clearContent();
						return;
					}
					
				}
				
				if (locals && locals.$loadingTemplate) {
					element.html(locals.$loadingTemplate);
				}

				// If the is a template, inject in the view 
				if (template) {
					$q.all([template]).then(function(tpl) {
						element.css('display', 'none');
						element.html(tpl[0]);
						element.css('display', 'inherit');
						
						_exec(element, $route, controller, locals);
					});
				} else {
					_exec(element, $route, controller, locals);
				}
			}
	
			/**
			 * execute the controller on the view element given a route and locals
			 * @param element : the html element of the view
			 * @param $route : the route
			 * @param controller : the controller to execute
			 * @param locals : the locals
			 */
			function _exec(element, $route, controller, locals) {
				destroyLastScope();
	
				var link = $compile(element.contents()),
				    current = $route.current,
				    controller;

				// Create the new scope
				if (current) {
					lastScope = current.scope = scope.$new();
				} else {
					lastScope = scope.$new();
				}

				if (controller) {
					locals = locals || {};
					locals.$scope = lastScope;
					controller = $controller(controller, locals);
					element.contents().data('$ngControllerController', controller);
				}
		
				link(lastScope);
				lastScope.$emit('$viewContentLoaded');
				lastScope.$eval(onloadExp);
		
				// $anchorScroll might listen on event...
				$anchorScroll();
			}
		}
	};
}]);