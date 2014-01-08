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
	factory('vdPageHead', function($window) {
		var titles = [];
		var titleWatchers = [];

		return {
			setTitle: function(controllerName, title) {
				titles.push({
					controller: controllerName,
					title: title
				});
				$window.document.title = title;
				if (angular.isDefined(titleWatchers[controllerName])) {
					titleWatchers[controllerName](title);
				}
			},
			watchTitle: function(controllerName, watcher) {
				titleWatchers[controllerName] = watcher;
			},
			removeTitle: function(controllerName) {
				for(var i=0, n=titles.length; i < n; i++) {
					if (titles[i].controllerName == controllerName) {
						titles.splice(i, 1);
						return true;
					}
				}
				return false;
			},
			getCurrentTitle: function() {
				return titles[titles.length-1].title;
			}
		}
	}).
	directive('vdMultiView', ['$http', '$templateCache', '$route', '$anchorScroll', '$compile',
	                        '$controller', '$rootScope', '$routeParams', '$injector', '$q', '$animate', 'vdPageHead',
	           function($http,   $templateCache,   $route,   $anchorScroll,   $compile,
	                    $controller, $rootScope, $routeParams, $injector, $q, $animate, $pageHead) {
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
				    oldPersist = null;
				
				// Updates the view when the route change or at initialisation of the directive
				scope.$on('$routeChangeSuccess', update);
				update();

				function trigger(element, eventName) {
					if (document.dispatchEvent) {
						var event = new Event(eventName);
						element.dispatchEvent(event);
					} else {
						element.fireEvent(eventName);
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
					$pageHead.removeTitle(attr.multiView);
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
					$animate.leave(element.contents());
					destroyLastScope();
					oldRouteInfo = null;
					oldPersist = null;
				}
		
				/**
				 * Update the view according to the $route informations.
				 */
				function update() {
				
					var configs = $route.current && $route.current['$route'] && $route.current['$route'].controllers,
					    locals = null,
					    template = null,
					    params = $route.current && $route.current.params,
					    controller = {},
					    config = null;
					
					if (configs) {
		
						// Searching for the controller related to this view
						var controller_found = false;
						var execute = false;
		
						angular.forEach($route.current['$route'].controllers, function(_config, index) {
							
							if (_config.view != attr.vdMultiView) {
								return false;
							}

							config = _config;

							if (typeof(config.controller) == 'string') {
								if (config.title) {
									$pageHead.setTitle(attr.controller, config.title);
								}
								
								$pageHead.watchTitle(config.controller, function(title) {
									_config.title = title;
								});
							}
							
							controller_found = true;
							config.params = params;
		
							var data = {
								id: config.id,
								params: params
							};
		    
		            		if (config.execute && angular.isFunction(config.execute)) {
								execute = config.execute(oldRouteInfo, data);
							} else {
								execute = true;
							}
							
							// If persist function is defined in the route, save if for later.
							// When there is no more controller for this wiew, we will call this func to
							// know if we must the content of this view
							if (config.persist && angular.isFunction(config.persist)) {
								oldPersist = config.persist;
							}
							
							// Save the old route information
							if ($route.current) {
								oldRouteInfo = data;
							}
		
							locals = config.locals;
							//template = locals && locals.$template;
							controller = config.controller;
							lastController = controller;

							if (config.template) {
								template = config.template;
							} else if (config.templateUrl) {
								template = $http.get(config.templateUrl, {cache: $templateCache}).
	                      			then(function(response) { return response.data; });
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
							//element.hide();
							//element.html(tpl[0]);
							element.html('');
							var enterElements = $('<div></div>').html(tpl[0]).contents();
							$animate.enter(enterElements, element);
							//element.show();
							
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
					destroyLastScope();
		
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