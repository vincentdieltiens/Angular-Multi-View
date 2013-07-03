'use strict';

/**
 * @ngdoc directive
 * @name directive:multiView
 * @restrict ECA
 *
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
	                        '$controller', '$rootScope', '$routeParams', '$injector', '$q', '$animator',
	           function($http,   $templateCache,   $route,   $anchorScroll,   $compile,
	                    $controller, $rootScope, $routeParams, $injector, $q, $animator) {
		return {
			restrict: 'ECA',
			terminal: true,
			scope: {
				persist: '@persist'
			},
			link: function(scope, element, attr) {
				var lastScope,
				    onloadExp = attr.onload || '',
				    lastController = null,
				    oldRouteInfo = null,
				    oldPersist = null,
				    animate = $animator(scope, attr);
				
				// Updates the view when the route change or at initialisation of the directive
				scope.$on('$routeChangeSuccess', update);
				update();

				function trigger(element, eventName) {
					if (document.fireEvent) { // < IE 9
						element.fireEvent(eventName)
					} else {
						var event = new Event(eventName);
						element.dispatchEvent(event);
					}
				}

				// Unload sub views and then the view
				element[0].addEventListener('$destroyLastScope', function(e) {
					e.stopPropagation();
					var subviews = element.find('[vd-multi-view], [data-vd-multi-view]');
					for(var i=0, n=subviews.length; i < n; i++) {
						if (subviews[i]) {
							trigger(subviews[i], '$destroyLastScope');
						}
					}

					if (lastScope && angular.isDefined(lastScope.$unload)) {
						lastScope.$unload();
					}
				});

				/**
				 * Destory the last scope.
				 */
				function destroyLastScope() {
					trigger(element[0], '$destroyLastScope');
					if (lastScope) {
						lastScope.$destroy();
						lastScope = null;
					}
				}

				/**
				 * Cleat the content of the directive element and destory the related scope
				 */
				function clearContent() {
					animate.leave(element.contents(), element);
					destroyLastScope();
					oldRouteInfo = null;
					oldPersist = null;
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
								execute = _controller.execute(oldRouteInfo, data);
							} else {
								execute = true;
							}
							
							// If persist function is defined in the route, save if for later.
							// When there is no more controller for this wiew, we will call this func to
							// know if we must the content of this view
							if (_controller.persist && angular.isFunction(_controller.persist)) {
								oldPersist = _controller.persist;
							}
							
							// Save the old route information
							if ($route.current) {
								oldRouteInfo = data;
							}
		
							locals = _controller.locals;
							//template = locals && locals.$template;
							controller = _controller.controller;
							lastController = controller;
							
							if (_controller.template) {
								template = _controller.template;
							} else if (_controller.templateUrl) {
								template = $http.get(_controller.templateUrl, {cache: $templateCache})
								    .then(function(response) { return response.data; });
							}
							
							return false;
						});

						var persist = oldPersist;
						var data = {
							id: null,
							params: params
						};

						// If there is no controller related to this view, we check if we must clear the content (persist = false) or not (persist = true)
						if( !controller_found ) {
							// Clear the content in case of :
							// - there is no 'persist' function defined in the route controller definition
							// - the 'persist' function return false
							if (persist  && !persist(oldRouteInfo, data) ) {
								clearContent();
								return;
							}
						}

						// Stop execution if we doesn't must execute the controller and the template
						if (!execute) {
							return;
						}
					} else {
						var persist = oldPersist;
						var data = {
							id: null,
							params: params
						};
						
						if (!persist || !persist(oldRouteInfo, data) ) {
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
							destroyLastScope();
							animate.leave(element.contents(), element);
							
							var enterElements = angular.element('<div></div>').html(tpl[0]).contents();
							animate.enter(enterElements, element);
							
							_exec(enterElements, element, $route, controller, locals);
						});
					} else {
						_exec(element.contents(), element, $route, controller, locals);
					}
				}

				/**
				 * execute the controller on the view element given a route and locals
				 * @param element : the html element of the view
				 * @param $route : the route
				 * @param controller : the controller to execute
				 * @param locals : the locals
				 */
				function _exec(enterElements, element, $route, controller, locals) {
					//destroyLastScope();

					var link = $compile(enterElements),
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