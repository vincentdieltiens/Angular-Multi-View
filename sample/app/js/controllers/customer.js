angular.module('controllers.customer', ['resources.customer'])
	// $routeProvider is a reference to the multiRouteProvider
	.config(function($routeProvider) {
		var customerListRoute = {
			// The id of the route
			id: 'customer_list',
			// The template url of the view
			templateUrl: 'app/templates/customer/list.html',
			// The view name
			view: 'part',
			// the controller
			controller: 'customer.list',
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
		
		$routeProvider
			.when('/customers', {
				controllers: [customerListRoute]
			})
			.when('/customers/:customerId', {
				controllers: [customerListRoute, customerShowRoute]
			});
	})
	
	.controller('customer.list', function($scope, customer) {
		console.log('load customer.list');
		
		$scope.customers = customer.query();

		$scope.$unload = function() {
			console.log('unload customer.list')
		};
	})
	
	.controller('customer.show', function($scope, $routeParams, customer) {
		console.log('load customer.show');
		
		$scope.customer = customer.get({'customerId': $routeParams.customerId});

		$scope.$unload = function() {
			console.log('unload customer.show')
		};
	});
