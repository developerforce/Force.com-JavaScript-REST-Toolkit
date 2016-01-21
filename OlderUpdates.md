Older Updates
=============

* [Visualforce Remote Objects](https://www.salesforce.com/us/developer/docs/pages/index_Left.htm#CSHID=pages_remote_objects.htm|StartTopic=Content%2Fpages_remote_objects.htm|SkinName=webhelp) are proxy objects that enable basic DML operations on sObjects directly from JavaScript. Behind the scenes, the Remote Objects controller handles sharing rules, field level security, and other data accessibility concerns. Pages that use Remote Objects are subject to all the standard Visualforce limits, but like JavaScript remoting, Remote Objects calls don’t count toward API request limits.

  
  Since Remote Objects are more secure than RemoteTK (which does not respect sharing rules, FLS etc since system-level access is proxied via the RemoteTK controller), and similarly do not consume API calls (the main motivation for RemoteTK), RemoteTK has been removed from the toolkit.

* Since the Summer '13 release, the `/services/data` endpoint has been exposed on Visualforce hosts, so no proxy is now required for REST API calls in JavaScript served via Visualforce (although the proxy **is** still required for calls to `/services/apexrest`). `forcetk.js` has been updated to reflect this.

* Inserting or updating blob data using the `create` or `update` functions (passing base64-encoded binary data in JSON) is limited by the REST API to 50 MB of text data or 37.5 MB of base64–encoded data. New functions, `createBlob` and `updateBlob`, allow creation and update of ContentVersion and Document records with binary ('blob') content with a size of up to 500 MB. Here is a minimal sample that shows how to upload a file to Chatter Files:

		<apex:page docType="html-5.0" title="File Uploader">
		  <h3>
		    Select a file to upload as a new Chatter File.
		  </h3>
		  <input type="file" id="file" onchange="upload()"/>
		  <p id="message"></p>
		  <script src="//code.jquery.com/jquery-1.11.2.min.js"></script>
		  <script src="{!$Resource.forcetk}"></script>
		  <script>
		    var client = new forcetk.Client();

		    client.setSessionToken('{!$Api.Session_ID}');

		    function upload() {
		        var file = $("#file")[0].files[0];
		        client.createBlob('ContentVersion', {
		            Origin: 'H', // 'H' for Chatter File, 'C' for Content Document
		            PathOnClient: file.name
		        }, file.name, 'VersionData', file)
		        .then(function(response){
		            console.log(response);
		            $("#message").html("Chatter File created: <a target=\"_blank\" href=\"/" + response.id + "\">Take a look!</a>");
		        })
		        .catch(function(request, status, response){
		            $("#message").html("Error: " + status);
		        });
		    }
		  </script>
		</apex:page>

	Under the covers, `createBlob` sends a multipart message. See the REST API doc page [Insert or Update Blob Data](https://www.salesforce.com/us/developer/docs/api_rest/Content/dome_sobject_insert_update_blob.htm) for more details.