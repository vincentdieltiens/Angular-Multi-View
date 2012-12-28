Angular-Multi-View
==================

With Angular-Multi-View, your AngularJS app can have multiples views and controllers for one URL. you can control when a view and his controller must be reloaded.

Content of this repo
--------------------

* 1 directive `vdMultiView` in lib/directives/multi_view.js
* 1 provider `vdMultiRoute` in lib/directives/multi_route.js
* 1 sample in lib/sample : this is an application that can browse customers or suppliers (very basic) to illustrates the directive and multiroute

Example :
---------

See an example in action : http://angularjs.vincentdieltiens.be/AngularMultiView/sample
See the code of this sample in the `sample` directory..

How To Use Angular-Multi-View
-----------------------------

1. In your app html file, include angular.js, lib/directives/multi_view.js, lib/providers/multi_route.js :

	<script type="text/javascript" src="app/js/lib/angular.js"></script>
	<script type="text/javascript" src="app/js/lib/angular-resource.js"></script>
	<script type="text/javascript" src="../lib/directives/multi_view.js"></script>
	<script type="text/javascript" src="../lib/providers/multi_route.js"></script>
	
2. In your application js file, load the two modules :

		angular.module('yourApp', ['vd.multi_route', 'vd.multi_view'])
	
3. For each view html element add the attribute vd-multi-view with as the value the name of the view

		<div id="content" vd-multi-view="part"></div>
	
		<div id="customer_show_col" vd-multi-view="customer_show"></div>
	
4. configure the routes :

		angular.module('controllers.customer', ['resources.customer'])
			// $routeProvider is a reference to the multiRouteProvider
			.config(function($routeProvider) {
			
				...
			
				$routeProvider
					.when('/customers', {
						controllers: [customerListRoute]
					})
					.when('/customers/:customerId', {
						controllers: [customerListRoute, customerShowRoute]
					});
			});
	
	In this example we have two routes `/customers` and `/customers/:customerId` defined.
	For the first one, one controller (stored in the var customerListRoute) is defined, for the second 2 controllers are defined (in customerListRoute and customerShowRoute vars)

	See now the content of this two vars :
		
		var customerListRoute = {
			// The id of the route
			id: 'customer_list',
			// The template url of the view (you can also use the template key as in the angular $route)
			templateUrl: 'app/templates/customer/list.html',
			// The related view name
			view: 'part',
			// the controller
			controller: 'customer.list',
			// this function is called to know if the view me be empty or not when there is no more route definition for the view
			// this will be explained later
			persist: function(oldRouteInfo, newRouteInfo) {
				return oldRouteInfo && newRouteInfo
					&& oldRouteInfo.id == newRouteInfo.id;
			}
		};
		
		var customerShowRoute = {
			id: 'customer_show',
			templateUrl: 'app/templates/customer/show.html',
			view: 'customer_show',
			controller: 'customer.show',
			// This function is called to know if the controller must be executed or not
			// In this example, we will not rexecute the view if it is the same customer !
			// This useful when you have other sub-views
			execute: function(oldRouteInfo, newRouteInfo) {
				return !oldRouteInfo 
					|| !newRouteInfo
					|| oldRouteInfo.id != newRouteInfo.id
					|| oldRouteInfo.params.customerId != newRouteInfo.params.customerId;
			},
			persist: function(oldRouteInfo, newRouteInfo) {
				return oldRouteInfo && newRouteInfo 
					&& oldRouteInfo.params && newRouteInfo.params 
					&& oldRouteInfo.params.customerId == newRouteInfo.params.customerId;
			}
		};	

Controllers parameters :
------------------------

* id (optional) - {string} - must be unique (if not defined, timestamp with be used but it is harder to debug your app :))
* template – {string=} – html template as a string that should be used by vdMultiView directive. this property takes precedence over templateUrl.
* templateUrl – {string=} – path to an html template that should be used by vdMultiView.
* view (mandatory) - {string|function()=} - the name of the related view
* controller (optional) -  {string|function()=} - same as the $route of Angular.js
* execute (optional, default value = true) - {function()=} - this function is called by vdMultiView directive to know if the controller must be (re)executed. 

  it will be called with the following parameters :
	* oldRouteInfo {Object.<string>} - the informations of the last route
	* newRouteInfo {Object.<string>} - the informations of the new route

* persist (optional, default value = false) - {function()=} - this function will by called by vdMultiView directive at the next route to know if the directive must be empty if there is no controller in the current route that is related to the view
  it will be called with the following parameters :
	* oldRouteInfo {Object.<string>} - the informations of the last route
	* newRouteInfo {Object.<string>} - the informations of the new route

