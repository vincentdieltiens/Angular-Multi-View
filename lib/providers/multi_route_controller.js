'use strict';

angular.module('route_controller', [])
  .provider('routeController', RouteControllerProvider);
  
function RouteControllerProvider(){
  var routeControllers = {};

  this.register = function(routeController) {
  	routeControllers[routeController.controller] = routeController;
  }
  
  this.get = function(name) {
  	if (routeControllers[name]) {
  		return routeControllers[name];
  	}
  	
  	throw Error("No route controller "+name)
  }
  
  this.$get = [function() {
  	return routeControllers;
  }];
  
}