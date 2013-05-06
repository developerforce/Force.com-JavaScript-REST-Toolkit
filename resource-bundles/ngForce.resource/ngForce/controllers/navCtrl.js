app.controller('navCtrl', function($scope, $rootScope, vfRemote) {

	var pStageNames = vfRemote.describePicklistValues('Opportunity', 'StageName');

	pStageNames.then(function(results){
		$scope.stageNames = results;
		if(!$scope.$$phase) {
			$scope.$digest();
		}
	});

	$scope.broadcastFilter = function(filterExp) {
		log('clicked on ' + filterExp);
		$rootScope.$broadcast('UpdateFilter', {'StageName' : filterExp});
	};

});