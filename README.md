Angular-Multi-View
==================

With Angular-Multi-View, your AngularJS app can have multiples views and controllers for one URL. you can control when a view and his controller must be reloaded.

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
			// This functions is called to know if the controller must be executed or not
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

Example :
---------
	
See in the `sample` directory in the source