/*
 * This is a pretty exhaustive list of directive options
 * though most of them are usually not needed.
 * For our example case, we're extending html with a
 * new type of html element called "opp-box" -- note
 * that Angular will automatically translate camel case
 * to dash-case for html directives. Thus the directive name
 * becomes <opp-box></opp-box> instead of <oppBox> as specified
 * on the first line of the directive.
 *
 * Note that the ['', function(){}]; syntax, while weird looking
 * is valid. It's done this way to Dependency inject other modules
 * or features needed for this directive before the function is
 * invoked.
 */
app.directive('oppBox', function(){
	return {
		// priority: 1, // If this is an Attribute based Directive and 
		// if there is more than one directive attatched to this element
		// the priority will let you specify the order of opperations for
		// their execution.
		// 
		// terminal: true, // If this is true, no further directives on 
		// this element will be processed
		// 
		// scope: {}, // This is one of the key bits to Angular! Scope can
		// be set to:
		//	* an empty or populated object: {} which creates an isolated scope. 
		//	This is very powerful, but also anal retentive. When creating isolated 
		// 	scopes you can take scope properties of the parent and pass them
		// 	into the new isolated scope in three ways:
		// 		* {propertyName: '@' or '@attr'} This creates a scope variable
		// 			propertyName bound to the value of a DOM attribute. In other words
		// 			scope: {foo: @foo} will create a $scope.foo variable bound to the 
		// 			value of the DOM attribute foo. This is a Uni-directional binding
		// 			meaning if the value of the Dom attribute changes, so will the local
		// 			scope variable's value. However if the local scope variable changes
		// 			it will NOT update the dom attribute.
		// 		*	{propertyName: '=' or '=attr'} Similar to @, this creates a bound local
		// 			scope variable. However, the = operater establishes a bi-directional
		// 			binding. In other words, if your directives' local Scope updates the 
		// 			value of the attribute, the dom attribute itself is updated as well.
		// 		*	{propertyName: '&' or '&attr'} The & allows you to evaluate an angular
		// 			expression.
		// 
		// 	* true, which creates a child scope.
		// 	* and false or undefined which means that the directive will inherit
		// 		the current scope.
		// 
		// cont­rol­ler: function($scope, $element, $attrs, $transclue) {},
		// require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
		restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
		// template: '', // you can inline some html in a string here
		templateUrl: '/apex/oppBoxTmpl', // or specify a file to use as the template for the directive
		// replace: true, // if true, replace the contents of the containing element
		// transclude: true, // for more information on transclude see the angular.js docs
		// for more information on the compile function see the angular.js docs
		// compile: function(tElement, tAttrs, function transclude(function(scope, cloneLinkingFn){ return function linking(scope, elm, attrs){}})),
		link: function($scope, iElm, iAttrs, controller) {
			//all directives must return a link function, but the link function doesn't
			//have to actually do anything.
		}
	};
});