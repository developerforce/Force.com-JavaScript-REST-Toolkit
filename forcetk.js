/*
 * Copyright (c) 2011, salesforce.com, inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided
 * that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the
 * following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
 * the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or
 * promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

/* JavaScript library to wrap REST API on Visualforce. Leverages Ajax Proxy
 * (see http://bit.ly/sforce_ajax_proxy for details).
 *
 * Note that you must add the REST endpoint hostname for your instance (i.e. 
 * https://na1.salesforce.com/ or similar) as a remote site - in the admin
 * console, go to Your Name | Setup | Security Controls | Remote Site Settings
 */
 
var forcetk = window.forcetk;

if (forcetk === undefined) {
    forcetk = {};
}
 
if (forcetk.Client === undefined) {
    
	// We use $j rather than $ for jQuery so it works in Visualforce
	if (window.$j === undefined) {
	    $j = $;
	}

    /**
     * The Client provides a convenient wrapper for the Force.com REST API, 
     * allowing JavaScript in Visualforce pages to use the API via the Ajax
     * Proxy.
     * @param sessionId a salesforce.com session ID. In a Visualforce page,
     *                   use '{!$Api.sessionId}' to obtain a session ID.
     * @param [apiVersion="21.0"] Force.com API version
     * @constructor
     */
    forcetk.Client = function(sessionId, apiVersion, instanceUrl, proxyUrl) {
        this.sessionId = sessionId;
        this.apiVersion = (typeof apiVersion === 'undefined' || apiVersion == null)
            ?  'v21.0' : apiVersion;
        if (typeof instanceUrl === 'undefined' || instanceUrl == null) {
            // location.hostname can be of the form 'abc.na1.visual.force.com' or
            // 'na1.salesforce.com'. Split on '.', and take the [1] or [0] element
            // as appropriate
            var elements = location.hostname.split(".");
            var instance = (elements.length == 3) ? elements[0] : elements[1];
            this.instance_url = "https://"+instance+".salesforce.com";            
        } else {
            this.instance_url = instanceUrl;
        }
        if (typeof proxyUrl === 'undefined' || proxyUrl === null) {
            if (location.protocol === 'file:'){
                // In PhoneGap
                this.proxy_url = null;
            } else {
                // In Visualforce
                this.proxy_url = location.protocol + "//" + location.hostname
                + "/services/proxy";
            }
        } else {
            // On a server outside VF
            this.proxy_url = proxyUrl;
        }
    }

    /*
     * Low level utility function to call the Salesforce endpoint.
     * @param path resource path relative to /services/data
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     * @param [method="GET"] HTTP method for call
     * @param [payload=null] payload for POST/PATCH etc
     */
    forcetk.Client.prototype.ajax = function(path, callback, error, method, payload) {
        var url = this.instance_url + '/services/data' + path;
        var sessionId = this.sessionId;

        $j.ajax({
            type: (typeof method === 'undefined' || method == null) 
                ? "GET" : method,
            url: (this.proxy_url !== null) ? this.proxy_url : url,
            contentType: 'application/json',
            processData: false,
            data: (typeof payload === 'undefined' || payload == null) 
                ? null : payload,
            success: callback,
            error: error,
            dataType: "json",
            beforeSend: function(xhr) {
                if (this.proxy_url !== null) {
                    xhr.setRequestHeader('SalesforceProxy-Endpoint', url);
                }
                xhr.setRequestHeader("Authorization", "OAuth " + sessionId);
            }
        });
    }

    /*
     * Lists summary information about each Salesforce.com version currently 
     * available, including the version, label, and a link to each version's
     * root.
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    forcetk.Client.prototype.versions = function(callback, error) {
        this.ajax('/', callback, error);
    }

    /*
     * Lists available resources for the client's API version, including 
     * resource name and URI.
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    forcetk.Client.prototype.resources = function(callback, error) {
        this.ajax('/' + this.apiVersion + '/', callback, error);
    }

    /*
     * Lists the available objects and their metadata for your organization's 
     * data.
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    forcetk.Client.prototype.describeGlobal = function(callback, error) {
        this.ajax('/' + this.apiVersion + '/sobjects/', callback, error);
    }

    /*
     * Describes the individual metadata for the specified object.
     * @param objtype object type; e.g. "Account"
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    forcetk.Client.prototype.metadata = function(objtype, callback, error) {
        this.ajax('/' + this.apiVersion + '/sobjects/' + objtype + '/'
        , callback, error);
    }

    /*
     * Completely describes the individual metadata at all levels for the 
     * specified object.
     * @param objtype object type; e.g. "Account"
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    forcetk.Client.prototype.describe = function(objtype, callback, error) {
        this.ajax('/' + this.apiVersion + '/sobjects/' + objtype 
        + '/describe/', callback, error);
    }

    /*
     * Creates a new record of the given type.
     * @param objtype object type; e.g. "Account"
     * @param fields an object containing initial field names and values for 
     *               the record, e.g. {:Name "salesforce.com", :TickerSymbol 
     *               "CRM"}
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    forcetk.Client.prototype.create = function(objtype, fields, callback, error) {
        this.ajax('/' + this.apiVersion + '/sobjects/' + objtype + '/'
        , callback, error, "POST", JSON.stringify(fields));
    }

    /*
     * Retrieves field values for a record of the given type.
     * @param objtype object type; e.g. "Account"
     * @param id the record's object ID
     * @param fields comma-separated list of fields for which to return
     *               values; e.g. Name,Industry,TickerSymbol
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    forcetk.Client.prototype.retrieve = function(objtype, id, fieldlist, callback, error) {
        this.ajax('/' + this.apiVersion + '/sobjects/' + objtype + '/' + id 
        + '?fields=' + fieldlist, callback, error);
    }

    /*
     * Updates field values on a record of the given type.
     * @param objtype object type; e.g. "Account"
     * @param id the record's object ID
     * @param fields an object containing initial field names and values for 
     *               the record, e.g. {:Name "salesforce.com", :TickerSymbol 
     *               "CRM"}
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    forcetk.Client.prototype.update = function(objtype, id, fields, callback, error) {
        this.ajax('/' + this.apiVersion + '/sobjects/' + objtype + '/' + id
        , callback, error, "PATCH", JSON.stringify(fields));
    }

    /*
     * Deletes a record of the given type. Unfortunately, 'delete' is a 
     * reserved word in JavaScript.
     * @param objtype object type; e.g. "Account"
     * @param id the record's object ID
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    forcetk.Client.prototype.del = function(objtype, id, callback, error) {
        this.ajax('/' + this.apiVersion + '/sobjects/' + objtype + '/' + id
        , callback, error, "DELETE");
    }

    /*
     * Executes the specified SOQL query.
     * @param soql a string containing the query to execute - e.g. "SELECT Id, 
     *             Name from Account ORDER BY Name LIMIT 20"
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    forcetk.Client.prototype.query = function(soql, callback, error) {
        this.ajax('/' + this.apiVersion + '/query?q=' + escape(soql)
        , callback, error);
    }

    /*
     * Executes the specified SOSL search.
     * @param sosl a string containing the search to execute - e.g. "FIND 
     *             {needle}"
     * @param callback function to which response will be passed
     * @param [error=null] function to which jqXHR will be passed in case of error
     */
    forcetk.Client.prototype.search = function(sosl, callback, error) {
        this.ajax('/' + this.apiVersion + '/search?s=' + escape(sosl)
        , callback, error);
    }
}