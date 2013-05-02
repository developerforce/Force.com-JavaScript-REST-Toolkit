app.controller('navCtrl', function($scope, $rootScope, vfRemote) {

	var pStageNames = vfRemote.describePicklistValues('Opportunity', 'StageName');

	pStageNames.then(function(results){
		console.log(results);
		$scope.stageNames = results;
		$scope.$digest();
	});

	$scope.broadcastFilter = function(filterExp) {
		$rootScope.$broadcast('UpdateFilter', {'StageName' : filterExp});
	};

});