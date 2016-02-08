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

/*jslint browser: true, plusplus: true*/
/*global alert, Blob, Promise*/

var nonce  = +(new Date());
var rquery = (/\?/);

// Local utility to create a random string for multipart boundary
var randomString = function () {
    'use strict';
    var str = '',
        i;
    for (i = 0; i < 4; i += 1) {
        str += (Math.random().toString(16) + "000000000").substr(2, 8);
    }
    return str;
};

var param = function (data) {
    'use strict';
    var r20 = /%20/g,
        s = [],
        key;
    for (key in data) {
        if (data.hasOwnProperty(key)) {
            s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(data[key]);
        }
    }
    return s.join("&").replace(r20, "+");
};

export class Org {

    /**
     * The Client provides a convenient wrapper for the Force.com REST API, 
     * allowing JavaScript in Visualforce pages to use the API via the Ajax
     * Proxy.
     * @param [clientId=null] 'Consumer Key' in the Remote Access app settings
     * @param [loginUrl='https://login.salesforce.com/'] Login endpoint
     * @param [proxyUrl=null] Proxy URL. Omit if running on Visualforce or 
     *                  PhoneGap etc
     * @constructor
     */
    constructor(clientId, loginUrl, proxyUrl) {
        this.clientId = clientId;
        this.loginUrl = loginUrl || 'https://login.salesforce.com/';
        if (proxyUrl === undefined || proxyUrl === null) {
            if (location.protocol === 'file:' || location.protocol === 'ms-appx:') {
                // In PhoneGap
                this.proxyUrl = null;
            } else {
                // In Visualforce - still need proxyUrl for Apex REST methods
                this.proxyUrl = location.protocol + "//" + location.hostname
                    + "/services/proxy";
            }
            this.authzHeader = "Authorization";
        } else {
            // On a server outside VF
            this.proxyUrl = proxyUrl;
            this.authzHeader = "X-Authorization";
        }
        this.refreshToken = null;
        this.sessionId = null;
        this.apiVersion = null;
        this.visualforce = false;
        this.instanceUrl = null;
        this.asyncAjax = true;
    }

    /**
     * Set a refresh token in the client.
     * @param refreshToken an OAuth refresh token
     */
    setRefreshToken(refreshToken) {
        'use strict';
        this.refreshToken = refreshToken;
    }

    /**
     * Refresh the access token.
     */
    refreshAccessToken() {
        'use strict';
        var that = this,
            promise = new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest(),
                    url = this.loginUrl + '/services/oauth2/token',
                    payload = 'grant_type=refresh_token&client_id=' + that.clientId + '&refresh_token=' + that.refreshToken;

                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status > 199 && xhr.status < 300) {
                            resolve(xhr.responseText ? JSON.parse(xhr.responseText) : undefined);
                        } else {
                            console.error(xhr.responseText);
                            reject(xhr, xhr.statusText, xhr.response);
                        }
                    }
                };

                xhr.open('POST', url, true);
                xhr.setRequestHeader("Accept", "application/json");
                xhr.setRequestHeader('X-User-Agent', 'salesforce-toolkit-rest-javascript/' + that.apiVersion);
                xhr.send(payload);
            });

        return promise;
    }

    /**
     * Set a session token and the associated metadata in the client.
     * @param sessionId a salesforce.com session ID. In a Visualforce page,
     *                   use '{!$Api.sessionId}' to obtain a session ID.
     * @param [apiVersion="v35.0"] Force.com API version
     * @param [instanceUrl] Omit this if running on Visualforce; otherwise 
     *                   use the value from the OAuth token.
     */
    setSessionToken(sessionId, apiVersion, instanceUrl) {
        'use strict';
        this.sessionId = sessionId;
        this.apiVersion = (apiVersion === undefined || apiVersion === null)
            ? 'v35.0' : apiVersion;
        if (instanceUrl === undefined || instanceUrl === null) {
            this.visualforce = true;

            // location.hostname can be of the form 'abc.na1.visual.force.com',
            // 'na1.salesforce.com' or 'abc.my.salesforce.com' (custom domains). 
            // Split on '.', and take the [1] or [0] element as appropriate
            var elements = location.hostname.split("."),
                instance = null;
            if (elements.length === 4 && elements[1] === 'my') {
                instance = elements[0] + '.' + elements[1];
            } else if (elements.length === 3) {
                instance = elements[0];
            } else {
                instance = elements[1];
            }

            this.instanceUrl = "https://" + instance + ".salesforce.com";
        } else {
            this.instanceUrl = instanceUrl;
        }
    }

    /*
     * Low level utility function to call the Salesforce endpoint.
     * @param path resource path relative to /services/data
     * @param [method="GET"] HTTP method for call
     * @param [payload=null] string payload for POST/PATCH etc
     */
    ajax(path, method, payload, retry) {
        'use strict';

        var that = this,
            promise = new Promise(function (resolve, reject) {

                // dev friendly API: Add leading '/' if missing so url + path concat always works
                if (path.charAt(0) !== '/') {
                    path = '/' + path;
                }

                var xhr = new XMLHttpRequest(),
                    url = (that.visualforce ? '' : that.instanceUrl) + '/services/data' + path;

                method = method || 'GET';

                // Cache-busting logic inspired by jQuery
                url = url + (rquery.test(url) ? "&" : "?") + "_=" + nonce++;

                if (that.asyncAjax) {
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState === 4) {
                            if (xhr.status > 199 && xhr.status < 300) {
                                resolve(xhr.responseText ? JSON.parse(xhr.responseText) : undefined);
                            } else if (xhr.status === 401 && that.refresh_token) {
                                if (retry) {
                                    console.error(xhr.responseText);
                                    reject(xhr, xhr.statusText, xhr.response);
                                } else {
                                    // ATTN Christophe - does this look right?
                                    return that.refreshAccessToken()
                                        .then(function (oauthResponse) {
                                            that.setSessionToken(oauthResponse.access_token, null,
                                                oauthResponse.instance_url);
                                            return that.ajax(path, method, payload, true);
                                        });
                                }
                            } else {
                                console.error(xhr.responseText);
                                reject(xhr, xhr.statusText, xhr.response);
                            }
                        }
                    };
                }

                xhr.open(method, url, that.asyncAjax);
                xhr.setRequestHeader("Accept", "application/json");
                xhr.setRequestHeader(that.authzHeader, "Bearer " + that.sessionId);
                xhr.setRequestHeader('X-User-Agent', 'salesforce-toolkit-rest-javascript/' + that.apiVersion);
                if (method !== "DELETE") {
                    xhr.setRequestHeader("Content-Type", 'application/json');
                }
                xhr.send(payload);

                if (!that.asyncAjax) {
                    resolve(JSON.parse(xhr.responseText));
                }
            });

        return promise;
    }

    /**
     * Utility function to query the Chatter API and download a file
     * Note, raw XMLHttpRequest because JQuery mangles the arraybuffer
     * This should work on any browser that supports XMLHttpRequest 2 because arraybuffer is required. 
     * For mobile, that means iOS >= 5 and Android >= Honeycomb
     * @author Tom Gersic
     * @param path resource path relative to /services/data
     * @param mimetype of the file
     * @param retry true if we've already tried refresh token flow once
     */
    getChatterFile(path, mimeType, retry) {
        'use strict';
        var that = this,
            url = (this.visualforce ? '' : this.instanceUrl) + path,
            promise = new Promise(function (resolve, reject) {
                var request = new XMLHttpRequest();

                request.open("GET", (that.proxyUrl !== null && !that.visualforce) ? that.proxyUrl : url, true);
                request.responseType = "arraybuffer";

                request.setRequestHeader(that.authzHeader, "Bearer " + that.sessionId);
                request.setRequestHeader('X-User-Agent', 'salesforce-toolkit-rest-javascript/' + that.apiVersion);
                if (that.proxyUrl !== null && !that.visualforce) {
                    request.setRequestHeader('SalesforceProxy-Endpoint', url);
                }

                request.onreadystatechange = function () {
                    // continue if the process is completed
                    if (request.readyState === 4) {
                        // continue only if HTTP status is "OK"
                        if (request.status === 200) {
                            try {
                                // retrieve the response
                                resolve(request.response);
                            } catch (e) {
                                // display error message
                                alert("Error reading the response: " + e.toString());
                            }
                        } else if (request.status === 401 && !retry) {
                            //refresh token in 401
                            return that.refreshAccessToken()
                                .then(function (oauthResponse) {
                                    that.setSessionToken(oauthResponse.access_token, null,
                                        oauthResponse.instance_url);
                                    return that.getChatterFile(path, mimeType, true);
                                });
                        }

                        reject(request, request.statusText, request.response);
                    }
                };

                request.send();
            });

        return promise;
    }

    /* Low level function to create/update records with blob data
     * @param path resource path relative to /services/data
     * @param fields an object containing initial field names and values for 
     *               the record, e.g. {ContentDocumentId: "069D00000000so2", 
     *               PathOnClient: "Q1 Sales Brochure.pdf"}
     * @param filename filename for blob data; e.g. "Q1 Sales Brochure.pdf"
     * @param payloadField 'VersionData' for ContentVersion, 'Body' for Document
     * @param payload Blob, File, ArrayBuffer (Typed Array), or String payload
     * @param retry true if we've already tried refresh token flow once
     */
    blob(path, fields, filename, payloadField, payload, retry) {
        'use strict';
        var that = this,
            promise = new Promise(function (resolve, reject) {
                var url = (that.visualforce ? '' : that.instanceUrl) + '/services/data' + path,
                    boundary = randomString(),
                    blob = new Blob([
                        "--boundary_" + boundary + '\n'
                            + "Content-Disposition: form-data; name=\"entity_content\";" + "\n"
                            + "Content-Type: application/json" + "\n\n"
                            + JSON.stringify(fields)
                            + "\n\n"
                            + "--boundary_" + boundary + "\n"
                            + "Content-Type: application/octet-stream" + "\n"
                            + "Content-Disposition: form-data; name=\"" + payloadField
                            + "\"; filename=\"" + filename + "\"\n\n",
                        payload,
                        "\n\n"
                            + "--boundary_" + boundary + "--"
                    ], {type : 'multipart/form-data; boundary=\"boundary_' + boundary + '\"'}),
                    request = new XMLHttpRequest();

                request.open("POST", (that.proxyUrl !== null && !that.visualforce) ? that.proxyUrl : url, that.asyncAjax);

                request.setRequestHeader('Accept', 'application/json');
                request.setRequestHeader(that.authzHeader, "Bearer " + that.sessionId);
                request.setRequestHeader('X-User-Agent', 'salesforce-toolkit-rest-javascript/' + that.apiVersion);
                request.setRequestHeader('Content-Type', 'multipart/form-data; boundary=\"boundary_' + boundary + '\"');
                if (that.proxyUrl !== null && !that.visualforce) {
                    request.setRequestHeader('SalesforceProxy-Endpoint', url);
                }

                if (that.asyncAjax) {
                    request.onreadystatechange = function () {
                        // continue if the process is completed
                        if (request.readyState === 4) {
                            // continue only if HTTP status is good
                            if (request.status >= 200 && request.status < 300) {
                                // retrieve the response
                                resolve(request.response ? JSON.parse(request.response) : null);
                            } else if (request.status === 401 && !retry) {
                                return that.refreshAccessToken()
                                    .then(function (oauthResponse) {
                                        that.setSessionToken(oauthResponse.access_token, null,
                                            oauthResponse.instance_url);
                                        return that.blob(path, fields, filename, payloadField, payload, true);
                                    });
                            }
                            // return status message
                            reject(request, request.statusText, request.response);
                        }
                    };
                }

                request.send(blob);

                if (!that.asyncAjax) {
                    resolve(JSON.parse(request.responseText));
                }
            });

        return promise;
    }

    /*
     * Create a record with blob data
     * @param objtype object type; e.g. "ContentVersion"
     * @param fields an object containing initial field names and values for 
     *               the record, e.g. {ContentDocumentId: "069D00000000so2", 
     *               PathOnClient: "Q1 Sales Brochure.pdf"}
     * @param filename filename for blob data; e.g. "Q1 Sales Brochure.pdf"
     * @param payloadField 'VersionData' for ContentVersion, 'Body' for Document
     * @param payload Blob, File, ArrayBuffer (Typed Array), or String payload
     * @param retry true if we've already tried refresh token flow once
     */
    createBlob(objtype, fields, filename,
                                                   payloadField, payload, retry) {
        'use strict';
        return this.blob('/' + this.apiVersion + '/sobjects/' + objtype + '/',
                         fields, filename, payloadField, payload, retry);
    }

    /*
     * Update a record with blob data
     * @param objtype object type; e.g. "ContentVersion"
     * @param id the record's object ID
     * @param fields an object containing initial field names and values for 
     *               the record, e.g. {ContentDocumentId: "069D00000000so2", 
     *               PathOnClient: "Q1 Sales Brochure.pdf"}
     * @param filename filename for blob data; e.g. "Q1 Sales Brochure.pdf"
     * @param payloadField 'VersionData' for ContentVersion, 'Body' for Document
     * @param payload Blob, File, ArrayBuffer (Typed Array), or String payload
     * @param retry true if we've already tried refresh token flow once
     */
    updateBlob(objtype, id, fields, filename,
                                                   payloadField, payload, retry) {
        'use strict';
        return this.blob('/' + this.apiVersion + '/sobjects/' + objtype + '/' + id +
                         '?_HttpMethod=PATCH', fields, filename, payloadField, payload, retry);
    }

    /*
     * Low level utility function to call the Salesforce endpoint specific for Apex REST API.
     * @param path resource path relative to /services/apexrest
     * @param [method="GET"] HTTP method for call
     * @param [payload=null] string or object with payload for POST/PATCH etc or params for GET
     * @param [paramMap={}] parameters to send as header values for POST/PATCH etc
     * @param [retry] specifies whether to retry on error
     */
    apexrest(path, method, payload, paramMap, retry) {
        'use strict';

        var that = this,
            promise = new Promise(function (resolve, reject) {

                // dev friendly API: Add leading '/' if missing so url + path concat always works
                if (path.charAt(0) !== '/') {
                    path = '/' + path;
                }

                var xhr = new XMLHttpRequest(),
                    url = that.instanceUrl + '/services/apexrest' + path,
                    paramName;

                method = method || 'GET';

                if (method === "GET") {
                    // Handle proxied query params correctly
                    if (that.proxyUrl && payload) {
                        if (typeof payload !== 'string') {
                            payload = param(payload);
                        }
                        url += "?" + payload;
                        payload = null;
                    }
                } else {
                    // Allow object payload for POST etc
                    if (payload && typeof payload !== 'string') {
                        payload = JSON.stringify(payload);
                    }
                }

                // Cache-busting logic inspired by jQuery
                url = url + (rquery.test(url) ? "&" : "?") + "_=" + nonce++;

                if (that.asyncAjax) {
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState === 4) {
                            if (xhr.status > 199 && xhr.status < 300) {
                                resolve(xhr.responseText ? JSON.parse(xhr.responseText) : undefined);
                            } else if (xhr.status === 401 && that.refresh_token) {
                                if (retry) {
                                    console.error(xhr.responseText);
                                    reject(xhr, xhr.statusText, xhr.response);
                                } else {
                                    return that.refreshAccessToken()
                                        .then(function (oauthResponse) {
                                            that.setSessionToken(oauthResponse.access_token, null,
                                                oauthResponse.instance_url);
                                            return that.apexrest(path, method, payload, paramMap, true);
                                        });
                                }
                            } else {
                                console.error(xhr.responseText);
                                reject(xhr, xhr.statusText, xhr.response);
                            }
                        }
                    };
                }

                xhr.open(method, that.proxyUrl || url, that.asyncAjax);
                xhr.setRequestHeader("Accept", "application/json");
                xhr.setRequestHeader(that.authzHeader, "Bearer " + that.sessionId);
                xhr.setRequestHeader('X-User-Agent', 'salesforce-toolkit-rest-javascript/' + that.apiVersion);
                xhr.setRequestHeader("Content-Type", 'application/json');

                //Add any custom headers
                if (paramMap === null) {
                    paramMap = {};
                }
                for (paramName in paramMap) {
                    if (paramMap.hasOwnProperty(paramName)) {
                        xhr.setRequestHeader(paramName, paramMap[paramName]);
                    }
                }

                if (that.proxyUrl !== null) {
                    xhr.setRequestHeader('SalesforceProxy-Endpoint', url);
                }

                xhr.send(payload);

                if (!that.asyncAjax) {
                    resolve(JSON.parse(xhr.responseText));
                }
            });

        return promise;
    }


    /*
     * Lists summary information about each Salesforce.com version currently 
     * available, including the version, label, and a link to each version's
     * root.
     */
    versions() {
        'use strict';
        return this.ajax('/');
    }

    /*
     * Lists available resources for the client's API version, including 
     * resource name and URI.
     */
    resources() {
        'use strict';
        return this.ajax('/' + this.apiVersion + '/');
    }

    /*
     * Lists the available objects and their metadata for your organization's 
     * data.
     */
    describeGlobal() {
        'use strict';
        return this.ajax('/' + this.apiVersion + '/sobjects/');
    }

    /*
     * Describes the individual metadata for the specified object.
     * @param objtype object type; e.g. "Account"
     */
    metadata(objtype) {
        'use strict';
        return this.ajax('/' + this.apiVersion + '/sobjects/' + objtype + '/');
    }

    /*
     * Completely describes the individual metadata at all levels for the 
     * specified object.
     * @param objtype object type; e.g. "Account"
     */
    describe(objtype) {
        'use strict';
        return this.ajax('/' + this.apiVersion + '/sobjects/' + objtype
            + '/describe/');
    }

    /*
     * Creates a new record of the given type.
     * @param objtype object type; e.g. "Account"
     * @param fields an object containing initial field names and values for 
     *               the record, e.g. {:Name "salesforce.com", :TickerSymbol 
     *               "CRM"}
     */
    create(objtype, fields) {
        'use strict';
        return this.ajax('/' + this.apiVersion + '/sobjects/' + objtype + '/', "POST", JSON.stringify(fields));
    }

    /*
     * Retrieves field values for a record of the given type.
     * @param objtype object type; e.g. "Account"
     * @param id the record's object ID
     * @param [fields=null] optional comma-separated list of fields for which 
     *               to return values; e.g. Name,Industry,TickerSymbol
     */
    retrieve(objtype, id, fieldlist) {
        'use strict';
        var fields = fieldlist ? '?fields=' + fieldlist : '';
        return this.ajax('/' + this.apiVersion + '/sobjects/' + objtype + '/' + id
            + fields);
    }

    /*
     * Upsert - creates or updates record of the given type, based on the 
     * given external Id.
     * @param objtype object type; e.g. "Account"
     * @param externalIdField external ID field name; e.g. "accountMaster__c"
     * @param externalId the record's external ID value
     * @param fields an object containing field names and values for 
     *               the record, e.g. {:Name "salesforce.com", :TickerSymbol 
     *               "CRM"}
     */
    upsert(objtype, externalIdField, externalId, fields) {
        'use strict';
        return this.ajax('/' + this.apiVersion + '/sobjects/' + objtype + '/' + externalIdField + '/' + externalId
            + '?_HttpMethod=PATCH', "POST", JSON.stringify(fields));
    }

    /*
     * Updates field values on a record of the given type.
     * @param objtype object type; e.g. "Account"
     * @param id the record's object ID
     * @param fields an object containing initial field names and values for 
     *               the record, e.g. {:Name "salesforce.com", :TickerSymbol 
     *               "CRM"}
     */
    update(objtype, id, fields) {
        'use strict';
        return this.ajax('/' + this.apiVersion + '/sobjects/' + objtype + '/' + id
            + '?_HttpMethod=PATCH', "POST", JSON.stringify(fields));
    }

    /*
     * Deletes a record of the given type. Unfortunately, 'delete' is a 
     * reserved word in JavaScript.
     * @param objtype object type; e.g. "Account"
     * @param id the record's object ID
     */
    del(objtype, id) {
        'use strict';
        return this.ajax('/' + this.apiVersion + '/sobjects/' + objtype + '/' + id, "DELETE");
    }

    /*
     * Executes the specified SOQL query.
     * @param soql a string containing the query to execute - e.g. "SELECT Id, 
     *             Name from Account ORDER BY Name LIMIT 20"
     */
    query(soql) {
        'use strict';
        return this.ajax('/' + this.apiVersion + '/query?q=' + encodeURIComponent(soql));
    }

    /*
     * Queries the next set of records based on pagination.
     * <p>This should be used if performing a query that retrieves more than can be returned
     * in accordance with http://www.salesforce.com/us/developer/docs/api_rest/Content/dome_query.htm</p>
     * <p>Ex: forcetkClient.queryMore(successResponse.nextRecordsUrl, successHandler, failureHandler)</p>
     * 
     * @param url - the url retrieved from nextRecordsUrl or prevRecordsUrl
     */
    queryMore(url) {
        'use strict';
        //-- ajax call adds on services/data to the url call, so only send the url after
        var serviceData = "services/data",
            index = url.indexOf(serviceData);

        if (index > -1) {
            url = url.substr(index + serviceData.length);
        }

        return this.ajax(url);
    }

    /*
     * Executes the specified SOSL search.
     * @param sosl a string containing the search to execute - e.g. "FIND 
     *             {needle}"
     */
    search(sosl) {
        'use strict';
        return this.ajax('/' + this.apiVersion + '/search?q=' + encodeURIComponent(sosl));
    }

}
