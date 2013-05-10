app.controller('oppDetailsController', function($scope, $dialog, dialog, oppId) {
	$scope.oppId = oppId;
  $scope.close = function(result){
    dialog.close(result);
  };
});