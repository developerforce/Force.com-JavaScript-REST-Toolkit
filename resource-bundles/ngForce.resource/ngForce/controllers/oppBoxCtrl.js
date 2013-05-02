app.controller('oppBoxCtrl', function($scope, $rootScope, vfRemote) {

	var pOppQuery = vfRemote.query("SELECT Id, Name, Account.Name, LeadSource, Probability, CloseDate, StageName, Amount FROM Opportunity ORDER BY CloseDate DESC");
	pOppQuery.then(function(d) {
		$scope.opportunities = [];
		var i, j, chunk = 3;
		for (i=0, j=d.records.length; i<j; i+=chunk) {
			$scope.opportunities.push(d.records.slice(i,i+chunk));
		}

		$scope.$digest();
	});

	// we want the initial filter expression to filter nothing out
	// ie: show all the records
	$scope.filterExpr = {};

	// Since the selection of the filter comes from an external controller
	// -- navCtrl.js -- we'll "watch" for a broadcast message telling this
	// controller to update the filter
	$rootScope.$watch('UpdateFilter', function(newValue) {
		$scope.filterExpr('newValue');
	});

	pOppQuery.fail(function(e){log(e);});

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


});