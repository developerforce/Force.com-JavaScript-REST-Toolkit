BulkTK: Force.com Bulk API JavaScript Toolkit
=============================================

This minimal toolkit extends ForceTK to allow JavaScript in web pages to call the [Force.com Bulk API](https://www.salesforce.com/us/developer/docs/api_asynch/).

Background
==========

The Force.com Bulk API allows asynchronous data access. BulkTK extends ForceTK with methods to create Bulk API jobs, add batches to them, monitor job status and retrieve job results. Control plane XML is parsed to JavaScript objects for ease of use, while data is returned verbatim.

You should familiarize yourself with the [Force.com Bulk API documentation](https://www.salesforce.com/us/developer/docs/api_asynch/), since BulkTK is a relatively thin layer on the raw XML Bulk API.

[bulk.page](https://github.com/developerforce/Force.com-JavaScript-REST-Toolkit/blob/master/bulk.page) is a simple Visualforce single page application to demonstrate BulkTK. Try it out in a sandbox or developer edition.

Note that, just like ForceTK, BulkTK is unsupported and supplied as is. It is also currently in a very early stage of development. It appears to work well, but bugs cannot be ruled out, and the interface should not be considered stable.

Dependencies
============

 *  [jquery](http://jquery.com/)
 *  [ForceTK](https://github.com/developerforce/Force.com-JavaScript-REST-Toolkit)
 *  [jxon](https://github.com/developerforce/Force.com-JavaScript-REST-Toolkit/blob/master/jxon.js) (originally from the [Ratatosk](https://github.com/wireload/Ratatosk) project; this version preserves case in element and attribute names)

Example Usage
=============

This example focuses on Visualforce. See the [ForceTK documentation](https://github.com/developerforce/Force.com-JavaScript-REST-Toolkit) for details on authenticating from an external website, such as a Heroku app, or PhoneGap/Cordova.

First, include BulkTK and its dependencies:

    <script src="{!$Resource.jquery}"></script>
    <script src="{!$Resource.forcetk}"></script>
    <script src="{!$Resource.jxon}"></script>
    <script src="{!$Resource.bulkTK}"></script>

Now create a ForceTK client:

    var client = new forcetk.Client();
    client.setSessionToken('{!$Api.Session_ID}');

See the [ForceTK documentation](https://github.com/developerforce/Force.com-JavaScript-REST-Toolkit) for details on authenticating from an external website, such as a Heroku app, or PhoneGap/Cordova.

Create a job
------------

    // See https://www.salesforce.com/us/developer/docs/api_asynch/Content/asynch_api_reference_jobinfo.htm
    // for details of the JobInfo structure

    // Insert Contact records in CSV format
    var job = {
        operation : 'insert',
        object : 'Contact',
        contentType : 'CSV'
    };
    
    client.createJob(job, function(response) {
        jobId = response.jobInfo.id;
        console.log('Job created with id '+jobId+'\n');
    }, function(jqXHR, textStatus, errorThrown) {
        console.log('Error creating job', jqXHR.responseText);
    });          

Add a batch of records to the job
---------------------------------

You can add multiple batches to the job; each batch can contain up to 10,000 records. See [batch size and limits](https://www.salesforce.com/us/developer/docs/api_asynch/Content/asynch_api_concepts_limits.htm#batch_size_title) for more details.

    var csvData = "FirstName,LastName,Department,Birthdate,Description\n"+
                  "Tom,Jones,Marketing,1940-06-07Z,"Self-described as ""the top"" branding guru on the West Coast\n"+
                  "Ian,Dury,R&D,,"World-renowned expert in fuzzy logic design. Influential in technology purchases."\n";

    client.addBatch(jobId, "text/csv; charset=UTF-8", csvData, 
    function(response){
        console.log('Added batch '+response.batchInfo.id+'. State: '+response.batchInfo.state+'\n');
    }, function(jqXHR, textStatus, errorThrown) {
        console.log('Error adding batch', jqXHR.responseText);
    });

See BulkAPISampleFiles for sample CSV and XML data for different operations.

Close the job
-------------

You must close the job to inform Salesforce that no more batches will be submitted for the job.

    client.closeJob(jobId, function(response){
        console.log('Job closed. State: '+response.jobInfo.state+'\n');
    }, function(jqXHR, textStatus, errorThrown) {
        console.log('Error closing job', jqXHR.responseText);
    });

Check batch status
------------------

    client.getBatchDetails(jobId, batchId, function(response){
        console.log('Batch state: '+response.batchInfo.state+'\n');
    }, function(jqXHR, textStatus, errorThrown) {
        console.log('Error getting batch details', jqXHR.responseText);
    });

Get batch results
-----------------

Pass `true` as the `parseXML` parameter to get batch results for a query, false otherwise.

    client.getBatchResult(jobId, batchId, false, function(response){
        console.log('Batch result: '+response);
    }, function(jqXHR, textStatus, errorThrown) {
        console.log('Error getting batch result', jqXHR.responseText);
    });

Bulk query
----------

When adding a batch to a bulk query job, the `contentType` for the request must be either `text/csv` or `application/xml`, depending on the content type specified when the job was created. The actual SOQL statement supplied for the batch will be in plain text format.

    var soql = 'SELECT Id, FirstName, LastName, Email FROM Contact';

    client.addBatch(jobId, 'text/csv', soql, function(response){
        console.log('Batch state: '+response.batchInfo.state+'\n');
    }, function(jqXHR, textStatus, errorThrown) {
        console.log('Error getting batch result', jqXHR.responseText);
    });

Getting bulk query results is a two step process. Call `getBatchResult()` with `parseXML` set to `true` to get a set of result IDs, then call `getBulkQueryResult()` to get the actual records for each result

    client.getBatchResult(jobId, batchId, true, function(response){
        response['result-list'].result.forEach(function(resultId){
            client.getBulkQueryResult(jobId, batchId, resultId, function(response){
                console.log('Batch result: '+response);
            }, function(jqXHR, textStatus, errorThrown) {
                console.log('Error getting bulk query results', jqXHR.responseText);
            });
        });
    }, function(jqXHR, textStatus, errorThrown) {
        console.log('Error getting batch result', jqXHR.responseText);
    });
