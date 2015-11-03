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
 * @param callback function to which response will be passed
 * @param [error=null] function to which jqXHR will be passed in case of error
 * @param [method="GET"] HTTP method for call
 * @param [contentType=null] Content type of payload - e.g. 'application/xml; charset=UTF-8'
 * @param [payload=null] payload for POST
 * @param [parseXML=false] set to true to parse XML response
 */
forcetk.Client.prototype.bulkAjax = function(path, parseXML, callback, error, method, contentType, payload, retry) {
    var that = this;
    var url = this.instanceUrl + path;
    
    if (this.debug) {
        console.log('bulkAjax sending: ', payload);
    }
    
    return $.ajax({
        type: method || "GET",
        async: this.asyncAjax,
        url: (this.proxyUrl !== null) ? this.proxyUrl: url,
        contentType: method == "DELETE"  ? null : contentType,
        cache: false,
        processData: false,
        data: payload,
        success: function(data, textStatus, jqXHR) {
            var respContentType = jqXHR.getResponseHeader('Content-Type');
            // Naughty Bulk API doesn't always set Content-Type!
            if (parseXML && 
                ((respContentType && respContentType.indexOf('application/xml') === 0) ||
                data.indexOf('<?xml') === 0)) {
                data = JXON.fromXML(data);
            }
            callback(data, textStatus, jqXHR);
        },
        error: (!that.refreshToken || retry ) ? error : function(jqXHR, textStatus, errorThrown) {
            if (jqXHR.status === 401) {
                that.refreshAccessToken(function(oauthResponse) {
                    that.setSessionToken(oauthResponse.access_token, null,
                    oauthResponse.instance_url);
                    that.ajax(path, callback, error, method, payload, true);
                },
                error);
            } else {
                error(jqXHR, textStatus, errorThrown);
            }
        },
        dataType: "text",
        beforeSend: function(xhr) {
            if (that.proxyUrl !== null) {
                xhr.setRequestHeader('SalesforceProxy-Endpoint', url);
            }
            xhr.setRequestHeader('X-SFDC-Session', that.sessionId);
            xhr.setRequestHeader('X-User-Agent', 'salesforce-toolkit-rest-javascript/' + that.apiVersion);
        }
    });
};

/*
 * Creates a new Bulk API job.
 * @param job JobInfo structure - see Bulk API docs
 * @param callback function to which response will be passed
 * @param [error=null] function to which jqXHR will be passed in case of error
 */
forcetk.Client.prototype.createJob = function(job, callback, error) {
    job["@xmlns"] = "http://www.force.com/2009/06/asyncapi/dataload";
    
    var xmlJob = this.xmlHeader + JXON.toXML(job, "jobInfo");
    
    return this.bulkAjax('/services/async/33.0/job', true, callback, error, 'POST', 'application/xml; charset=UTF-8', xmlJob);
};

/*
 * Adds a batch to a Bulk API job.
 * @param jobId Job ID
 * @param contentType Content type of data to be uploaded; e.g. "text/csv; charset=UTF-8"
 * @param data Blob, File, ArrayBuffer (Typed Array), or String payload
 * @param callback function to which response will be passed
 * @param [error=null] function to which jqXHR will be passed in case of error
 */
forcetk.Client.prototype.addBatch = function(jobId, contentType, data, callback, error) {
    return this.bulkAjax('/services/async/33.0/job/'+jobId+'/batch', true, callback, error, 'POST', contentType, data);
};

/*
 * Low level function to set job state.
 * @param jobId Job ID
 * @param state New state; e.g. "Closed"
 * @param callback function to which response will be passed
 * @param [error=null] function to which jqXHR will be passed in case of error
 */
forcetk.Client.prototype.setJobState = function(jobId, state, callback, error) {
    var job = {
        "@xmlns" : "http://www.force.com/2009/06/asyncapi/dataload",
        state : state
    };

    var xmlJob = this.xmlHeader + JXON.toXML(job, "jobInfo");
    
    //console.log(xmlJob);
    
    return this.bulkAjax('/services/async/33.0/job/'+jobId, true, callback, error, 'POST', 'application/xml; charset=UTF-8', xmlJob);
};

/*
 * Close a Bulk API job.
 * @param jobId Job ID
 * @param callback function to which response will be passed
 * @param [error=null] function to which jqXHR will be passed in case of error
 */
forcetk.Client.prototype.closeJob = function(jobId, callback, error) {
    return this.setJobState(jobId, 'Closed', callback, error, true);
};

/*
 * Abort a Bulk API job.
 * @param jobId Job ID
 * @param callback function to which response will be passed
 * @param [error=null] function to which jqXHR will be passed in case of error
 */
forcetk.Client.prototype.abortJob = function(jobId, callback, error) {
    return this.setJobState(jobId, 'Aborted', callback, error, true);
};

/*
 * Get Bulk API job details.
 * @param jobId Job ID
 * @param callback function to which response will be passed
 * @param [error=null] function to which jqXHR will be passed in case of error
 */
forcetk.Client.prototype.getJobDetails = function(jobId, callback, error) {
    return this.bulkAjax('/services/async/33.0/job/'+jobId, true, callback, error);
};

/*
 * Get details for all the batches in a Bulk API job.
 * @param jobId Job ID
 * @param callback function to which response will be passed
 * @param [error=null] function to which jqXHR will be passed in case of error
 */
forcetk.Client.prototype.getJobBatchDetails = function(jobId, callback, error) {
    return this.bulkAjax('/services/async/33.0/job/'+jobId+'/batch', true, function(response){
        // Ensure batchInfoList.batchInfo is always an array!
        if (!(response.batchInfoList.batchInfo instanceof Array)) {
            response.batchInfoList.batchInfo = [response.batchInfoList.batchInfo];
        }
        callback(response);
    }, error);
};

/*
 * Get details for a Bulk API batch.
 * @param jobId Job ID
 * @param batchId Batch ID
 * @param callback function to which response will be passed
 * @param [error=null] function to which jqXHR will be passed in case of error
 */
forcetk.Client.prototype.getBatchDetails = function(jobId, batchId, callback, error) {
    return this.bulkAjax('/services/async/33.0/job/'+jobId+'/batch/'+batchId, true, callback, error);
};

/*
 * Get the request data for a Bulk API batch.
 * @param jobId Job ID
 * @param batchId Batch ID
 * @param callback function to which response will be passed
 * @param [error=null] function to which jqXHR will be passed in case of error
 */
forcetk.Client.prototype.getBatchRequest = function(jobId, batchId, callback, error) {
    return this.bulkAjax('/services/async/33.0/job/'+jobId+'/batch/'+batchId+'/request', false, callback, error);
};

/*
 * Get the result data for a Bulk API batch.
 * @param jobId Job ID
 * @param batchId Batch ID
 * @param parseXML set to true to parse XML response
 * @param callback function to which response will be passed
 * @param [error=null] function to which jqXHR will be passed in case of error
 */
forcetk.Client.prototype.getBatchResult = function(jobId, batchId, parseXML, callback, error) {
    return this.bulkAjax('/services/async/33.0/job/'+jobId+'/batch/'+batchId+'/result', parseXML, function(response){
        // Ensure result-list.result is always an array!
        if (response['result-list'] && !(response['result-list'].result instanceof Array)) {
            response['result-list'].result = [response['result-list'].result];
        }
        callback(response);
    }, error);
};

/*
 * Get the result data for a Bulk API query.
 * @param jobId Job ID
 * @param batchId Batch ID
 * @param resultId Result ID
 * @param callback function to which response will be passed
 * @param [error=null] function to which jqXHR will be passed in case of error
 */
forcetk.Client.prototype.getBulkQueryResult = function(jobId, batchId, resultId, callback, error) {
    return this.bulkAjax('/services/async/33.0/job/'+jobId+'/batch/'+batchId+'/result/'+resultId, false, callback, error);
};