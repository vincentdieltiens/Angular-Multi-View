angular.module('resources.customer', ['ngResource'])
	.factory('customer', function($resource) {
		return $resource('app/data/customers.php?id=:customerId');
	});