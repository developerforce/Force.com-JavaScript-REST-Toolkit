app.controller('navCtrl', function($scope, $rootScope, vfr) {

	var pStageNames = vfr.describePicklistValues('Opportunity', 'StageName');

	pStageNames.then(function(results){
		$scope.stageNames = results;
		if(!$scope.$$phase) {
			$scope.$digest();
		}
	});

	$scope.broadcastFilter = function(filterExp) {
		$rootScope.$broadcast('UpdateFilter', {'StageName' : filterExp});
	};

});