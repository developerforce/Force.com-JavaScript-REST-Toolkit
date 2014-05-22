app.controller('oppBoxCtrl', function($scope, $dialog, vfr) {

	var pOppQuery = vfr.query("SELECT Id, Name, Account.Name, LeadSource, Probability, CloseDate, StageName, Amount FROM Opportunity ORDER BY CloseDate DESC");
	pOppQuery.then(function(d) {
		$scope.opportunities = d.records;
		if(!$scope.$$phase) {
			$scope.$digest();
		}
	});

	// we want the initial filter expression to filter nothing out
	// ie: show all the records
	$scope.filterExpr = {};

	// Since the selection of the filter comes from an external controller
	// -- navCtrl.js -- we'll "watch" for a broadcast message telling this
	// controller to update the filter
	$scope.$on('UpdateFilter', function(newValue, parameters) {
		$scope.filterExpr = parameters;
	});

	pOppQuery.fail(function(e){log(e);}); //if the query failes, log it.

	$scope.stageNameMap = {
		'Prospecting' : 'label label-info',
		'Qualification' : 'label label-info',
		'Needs Analysis' : 'label',
		'Value Proposition' : 'label',
		'Id. Decision Makers' : 'label label-warning',
		'Perception Analysis' : 'label label-warning',
		'Proposal/Price Quote' : 'label label-important',
		'Negotiation/Review' : 'label label-important',
		'Closed Won' : 'label label-success',
		'Closed Lost' : 'label label-inverse'
	};

	$scope.openDetailsDialog = function(oppId){

		var dialogOpts = {
			dialogClass: 'wideModal',
			backdrop: true,
			keyboard: true,
			backdropClick: true,
			templateUrl: '/apex/oppDetailsTmpl',
			controller: 'oppDetailsController',
			resolve: {
				oppId: function() {
					return angular.copy(oppId);
				}
			}
		};

		var d = $dialog.dialog(dialogOpts);
		d.open().then(function(result){
			if(result)
			{
				alert('dialog closed with result: ' + result);
			}
		});
	};

});