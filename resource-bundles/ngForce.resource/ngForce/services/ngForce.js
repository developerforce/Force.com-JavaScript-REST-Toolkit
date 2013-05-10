/*
 * ngForce - a visualForce remoting based Angular.js service for developing
 * Angular apps within Visualforce.
 *
 * Copyright (c)2013, Kevin Pooorman.
 * License: MIT
 *
 * Usage:
 *   This is modeled after the Angular builtin's $http and $resource modules
 *   Injection of this service into your controller, etc. exposes the
 *   ngForce object, and it's methods to your controller. These methods expose
 *   access via promise-based asyncronous Visualforce Remoting.
 *
 */

angular.module('ngForce', [], function($provide) {
	$provide.factory('vfr', function() {
		var vfRemote = {};
		/*
		 * Large swaths of this have been lifted and modified from the RemoteTK
		 * component provided as part of the
		 * https://github.com/developerforce/Force.com-JavaScript-REST-Toolkit
		 * Kudos to MetaDaddy / Pat P. for his Amazing work on this.
		 * Additional Kudos to Cwarden for demonstrating how to convert the
		 * callback based RemoteTk jquery calls to Promises/Deferred
		 * based code.
		 */

		handleResult = function(result, callback, error, nullok, deferred) {
			if (result) {
				result = JSON.parse(result);
				if (Array.isArray(result) && result[0].message && result[0].errorCode) {
					if (typeof error === 'function') {
						error(result);
					}
					deferred.reject(result);
				} else {
					if (typeof callback === 'function') {
						callback(result);
					}
					deferred.resolve(result);
				}
			} else if (typeof nullok !== 'undefined' && nullok) {
				if (typeof callback === 'function') {
					callback();
				}
				deferred.resolve();
			} else {
				var errorResult = [{
					message: "Null return from action method",
					"errorCode": "NULL_RETURN"
				}];
				if (typeof error === 'function') {
					error(errorResult);
				}
				deferred.reject(errorResult);
			}
		};

		/*
		 * The Client provides a convenient abstraction similar to the Force.com
		 * REST API, allowing JavaScript in Visualforce pages access to data
		 * without consuming API calls.
		 * @constructor
		 */
		// vfRemote.Client = function() {};

		/*
		 * Creates a set of new records of the given type.
		 * @param objtype object type; e.g. "Account"
		 * @param fields an Array of objects containing initial field names and values for
		 *               the record, e.g. [{Name: "salesforce.com", TickerSymbol:
		 *               "CRM"}]
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.bulkCreate = function(objtype, fields, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.bulkCreate', objtype, JSON.stringify(fields), function(result) {
				handleResult(result, callback, error, false, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Return the id of a cloned object for the given sobject id.
		 * @param id sobject id
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.clone = function(id, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.sObjectKlone}',
			id, function(result) {
				handleResult(result, callback, error, false, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Creates a new record of the given type.
		 * @param objtype object type; e.g. "Account"
		 * @param fields an object containing initial field names and values for
		 *               the record, e.g. {Name: "salesforce.com", TickerSymbol:
		 *               "CRM"}
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.create = function(objtype, fields, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.create', objtype, JSON.stringify(fields), function(result) {
				handleResult(result, callback, error, false, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Deletes a record of the given type. Unfortunately, 'delete' is a
		 * reserved word in JavaScript.
		 * @param objtype object type; e.g. "Account"
		 * @param id the record's object ID
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.del = function(objtype, id, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.del', objtype, id, function(result) {
				handleResult(result, callback, error, true, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Completely describes the individual metadata at all levels for the
		 * specified object.
		 * @param objtype object type; e.g. "Account"
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.describe = function(objtype, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.describe', objtype, function(result) {
				handleResult(result, callback, error, false, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Completely describes the individual metadata for the
		 * specified fieldset
		 * @param objtype object type; e.g. "Account"
		 * @param fieldSetName field set name; e.g. "details"
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.describeFieldSet = function(objtype, fieldSetName, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.describeFieldSet', objtype, fieldSetName, function(result) {
				handleResult(result, callback, error, false, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Completely describes the individual metadata for the
		 * specified fieldset
		 * @param objtype object type; e.g. "Account"
		 * @param fieldName picklist field name; e.g. "details"
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.describePicklistValues = function(objtype, fieldName, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.getPicklistValues', objtype, fieldName, function(result) {
				handleResult(result, callback, error, false, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Return the sObject api name for the given sobject id.
		 * @param id sobject id
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.getObjectType = function(id, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.getObjType}',
			id, function(result) {
				handleResult(result, callback, error, false, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Return the query results as a list of objects suitable for select2 consumption
		 * @param soql a string containing the query to execute - e.g. "SELECT Id,
		 *             Name from Account ORDER BY Name LIMIT 20"
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.getQueryResultsAsSelect2Data = function(soql, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.getQueryResultsAsSelect2Data', soql, function(result) {
				handleResult(result, callback, error, false, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Executes the specified SOQL query.
		 * @param soql a string containing the query to execute - e.g. "SELECT Id,
		 *             Name from Account ORDER BY Name LIMIT 20"
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.query = function(soql, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.query', soql, function(result) {
				handleResult(result, callback, error, false, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Build a query from a field set given an object id, and the fieldset name
		 * returning the query results
		 * @param objId ObjectId to query for fieldset and results.
		 * @param fieldSetName field set name; e.g. "details"
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.queryFromFieldset = function(objId, fieldSetName, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.queryFromFieldSet', objId, fieldSetName, function(result) {
				handleResult(result, callback, error, false, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Retrieves field values for a record of the given type.
		 * @param objtype object type; e.g. "Account"
		 * @param id the record's object ID
		 * @param [fields=null] optional comma-separated list of fields for which
		 *               to return values; e.g. Name,Industry,TickerSymbol
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.retrieve = function(objtype, id, fieldlist, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.retrieve', objtype, id, fieldlist, function(result) {
				handleResult(result, callback, error, false, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Executes the specified SOSL search.
		 * @param sosl a string containing the search to execute - e.g. "FIND
		 *             {needle}"
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.search = function(sosl, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.search', sosl, function(result) {
				handleResult(result, callback, error, false, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Build a querystring from a field set given an object type, and the fieldset name
		 * returning a JS object containing selectClause and fromClause properties.
		 * @param objtype object type; e.g. "Account"
		 * @param fieldSetName field set name; e.g. "details"
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.soqlFromFieldSet = function(objtype, fieldSetName, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.soqlFromFieldSet', objtype, fieldSetName, function(result) {
				handleResult(result, callback, error, false, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/*
		 * Updates field values on a record of the given type.
		 * @param objtype object type; e.g. "Account"
		 * @param id the record's object ID
		 * @param fields an object containing initial field names and values for
		 *               the record, e.g. {Name: "salesforce.com", TickerSymbol:
		 *               "CRM"}
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.update = function(objtype, id, fields, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.updat', objtype, id, JSON.stringify(fields), function(result) {
				handleResult(result, callback, error, true, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		/* 
		 * Upsert - creates or updates record of the given type, based on the
		 * given external Id.
		 * @param objtype object type; e.g. "Account"
		 * @param externalIdField external ID field name; e.g. "accountMaster__c"
		 * @param externalId the record's external ID value
		 * @param fields an object containing field names and values for
		 *               the record, e.g. {Name: "salesforce.com", TickerSymbol:
		 *               "CRM"}
		 * @param callback function to which response will be passed
		 * @param [error=null] function to which jqXHR will be passed in case of error
		 */
		vfRemote.upsert = function(objtype, externalIdField, externalId, fields, callback, error) {
			var deferred = $.Deferred();
			Visualforce.remoting.Manager.invokeAction('ngForceController.upser', objtype, externalIdField, externalId, JSON.stringify(fields), function(result) {
				handleResult(result, callback, error, true, deferred);
			}, {
				escape: false
			});
			return deferred.promise();
		};

		return vfRemote;
	});
});