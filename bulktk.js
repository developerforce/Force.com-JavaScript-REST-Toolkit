/*
 * Copyright (c) 2015, salesforce.com, inc.
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

/*jslint browser: true, plusplus: true*/
/*global alert, Promise, forcetk, JXON*/

/* 
 * BulkTK: JavaScript library to wrap Force.com Bulk API. Extends ForceTK.
 * Dependencies:
 *  jquery - http://jquery.com/
 *  ForceTK - https://github.com/developerforce/Force.com-JavaScript-REST-Toolkit/blob/master/forcetk.js
 *  jxon - https://github.com/developerforce/Force.com-JavaScript-REST-Toolkit/blob/master/jxon.js
 *      (originally from the [Ratatosk](https://github.com/wireload/Ratatosk) 
 *      project; this version preserves case in element and attribute names)
 */

forcetk.Client.prototype.xmlHeader = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";

/*
 * Low level utility function to call the Bulk API.
 * @param path resource path
 * @param parseXML set to true to parse XML response
 * @param [method="GET"] HTTP method for call
 * @param [contentType=null] Content type of payload - e.g. 'application/xml; charset=UTF-8'
 * @param [payload=null] payload for POST
 * @param [parseXML=false] set to true to parse XML response
 */
forcetk.Client.prototype.bulkAjax = function (path, parseXML, method, contentType, payload, retry) {
    'use strict';

    if (this.debug) {
        console.log('bulkAjax sending: ', payload);
    }

    var that = this,
        url = this.instanceUrl + path,
        promise = new Promise(function (resolve, reject) {

            method = method || 'GET';

            var xhr = new XMLHttpRequest();

            if (that.asyncAjax) {
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status > 199 && xhr.status < 300) {
                            var respContentType = xhr.getResponseHeader('Content-Type'),
                                data = xhr.responseText;
                            // Naughty Bulk API doesn't always set Content-Type!
                            if (parseXML &&
                                    ((respContentType && respContentType.indexOf('application/xml') === 0) ||
                                    data.indexOf('<?xml') === 0)) {
                                data = JXON.fromXML(data);
                            }
                            resolve(data);
                        } else if (xhr.status === 401 && that.refresh_token) {
                            if (retry) {
                                console.error(xhr.responseText);
                                reject(xhr, xhr.statusText, xhr.response);
                            } else {
                                return that.refreshAccessToken()
                                    .then(function (oauthResponse) {
                                        that.setSessionToken(oauthResponse.access_token, null,
                                            oauthResponse.instance_url);
                                        return that.bulkAjax(path, parseXML, method, contentType, payload, true);
                                    });
                            }
                        } else {
                            console.error(xhr.responseText);
                            reject(xhr, xhr.statusText, xhr.response);
                        }
                    }
                };
            }

            xhr.open(method, (that.proxyUrl !== null) ? that.proxyUrl : url, that.asyncAjax);
            xhr.setRequestHeader('X-SFDC-Session', that.sessionId);
            xhr.setRequestHeader('X-User-Agent', 'salesforce-toolkit-rest-javascript/' + that.apiVersion);
            xhr.setRequestHeader("Content-Type", contentType);
            if (that.proxyUrl !== null) {
                xhr.setRequestHeader('SalesforceProxy-Endpoint', url);
            }
            xhr.send(payload);

            if (!that.asyncAjax) {
                resolve(xhr.responseText);
            }
        });

    return promise;
};

/*
 * Creates a new Bulk API job.
 * @param job JobInfo structure - see Bulk API docs
 */
forcetk.Client.prototype.createJob = function (job) {
    'use strict';

    job["@xmlns"] = "http://www.force.com/2009/06/asyncapi/dataload";

    var xmlJob = this.xmlHeader + JXON.toXML(job, "jobInfo");

    return this.bulkAjax('/services/async/33.0/job', true, 'POST', 'application/xml; charset=UTF-8', xmlJob);
};

/*
 * Adds a batch to a Bulk API job.
 * @param jobId Job ID
 * @param contentType Content type of data to be uploaded; e.g. "text/csv; charset=UTF-8"
 * @param data Blob, File, ArrayBuffer (Typed Array), or String payload
 */
forcetk.Client.prototype.addBatch = function (jobId, contentType, data) {
    'use strict';

    return this.bulkAjax('/services/async/33.0/job/' + jobId + '/batch', true, 'POST', contentType, data);
};

/*
 * Low level function to set job state.
 * @param jobId Job ID
 * @param state New state; e.g. "Closed"
 */
forcetk.Client.prototype.setJobState = function (jobId, state) {
    'use strict';

    var job = {
        "@xmlns" : "http://www.force.com/2009/06/asyncapi/dataload",
        state : state
    },
        xmlJob = this.xmlHeader + JXON.toXML(job, "jobInfo");

    //console.log(xmlJob);

    return this.bulkAjax('/services/async/33.0/job/' + jobId, true, 'POST', 'application/xml; charset=UTF-8', xmlJob);
};

/*
 * Close a Bulk API job.
 * @param jobId Job ID
 */
forcetk.Client.prototype.closeJob = function (jobId) {
    'use strict';

    return this.setJobState(jobId, 'Closed', true);
};

/*
 * Abort a Bulk API job.
 * @param jobId Job ID
 */
forcetk.Client.prototype.abortJob = function (jobId) {
    'use strict';

    return this.setJobState(jobId, 'Aborted', true);
};

/*
 * Get Bulk API job details.
 * @param jobId Job ID
 */
forcetk.Client.prototype.getJobDetails = function (jobId) {
    'use strict';

    return this.bulkAjax('/services/async/33.0/job/' + jobId, true);
};

/*
 * Get details for all the batches in a Bulk API job.
 * @param jobId Job ID
 */
forcetk.Client.prototype.getJobBatchDetails = function (jobId) {
    'use strict';

    return this.bulkAjax('/services/async/33.0/job/' + jobId + '/batch', true)
        .then(function (response) {
            // Ensure batchInfoList.batchInfo is always an array!
            if (!(response.batchInfoList.batchInfo instanceof Array)) {
                response.batchInfoList.batchInfo = [response.batchInfoList.batchInfo];
            }
            return response;
        });
};

/*
 * Get details for a Bulk API batch.
 * @param jobId Job ID
 * @param batchId Batch ID
 */
forcetk.Client.prototype.getBatchDetails = function (jobId, batchId) {
    'use strict';

    return this.bulkAjax('/services/async/33.0/job/' + jobId + '/batch/' + batchId, true);
};

/*
 * Get the request data for a Bulk API batch.
 * @param jobId Job ID
 * @param batchId Batch ID
 */
forcetk.Client.prototype.getBatchRequest = function (jobId, batchId) {
    'use strict';

    return this.bulkAjax('/services/async/33.0/job/' + jobId + '/batch/' + batchId + '/request', false);
};

/*
 * Get the result data for a Bulk API batch.
 * @param jobId Job ID
 * @param batchId Batch ID
 * @param parseXML set to true to parse XML response
 */
forcetk.Client.prototype.getBatchResult = function (jobId, batchId, parseXML) {
    'use strict';

    return this.bulkAjax('/services/async/33.0/job/' + jobId + '/batch/' + batchId + '/result', parseXML)
        .then(function (response) {
            // Ensure result-list.result is always an array!
            if (response['result-list'] && !(response['result-list'].result instanceof Array)) {
                response['result-list'].result = [response['result-list'].result];
            }
            return response;
        });
};

/*
 * Get the result data for a Bulk API query.
 * @param jobId Job ID
 * @param batchId Batch ID
 * @param resultId Result ID
 */
forcetk.Client.prototype.getBulkQueryResult = function (jobId, batchId, resultId) {
    'use strict';

    return this.bulkAjax('/services/async/33.0/job/' + jobId + '/batch/' + batchId + '/result/' + resultId, false);
};