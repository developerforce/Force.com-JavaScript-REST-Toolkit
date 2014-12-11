Force.com JavaScript REST Toolkit
=================================

This minimal toolkit allows JavaScript in web pages to call the Force.com REST API in a number of different ways.

Background
----------

ForceTK provides a convenient, thin JavaScript abstraction of the [Force.com REST API](https://developer.salesforce.com/page/REST_API), making the API more accessible to JavaScript code running in Visualforce, in hybrid mobile apps, and elsewhere.

Due to the [same origin policy](http://en.wikipedia.org/wiki/Same_origin_policy), JavaScript running outside the Force.com Platform may not use [XMLHttpRequest](http://en.wikipedia.org/wiki/XMLHttpRequest) to directly invoke the REST API, so a minimal PHP proxy is provided.

Recent Updates
--------------

* [Visualforce Remote Objects](https://www.salesforce.com/us/developer/docs/pages/index_Left.htm#CSHID=pages_remote_objects.htm|StartTopic=Content%2Fpages_remote_objects.htm|SkinName=webhelp) are proxy objects that enable basic DML operations on sObjects directly from JavaScript. Behind the scenes, the Remote Objects controller handles sharing rules, field level security, and other data accessibility concerns. Pages that use Remote Objects are subject to all the standard Visualforce limits, but like JavaScript remoting, Remote Objects calls don’t count toward API request limits.

  
  Since Remote Objects are more secure than RemoteTK (which does not respect sharing rules, FLS etc since system-level access is proxied via the RemoteTK controller), and similarly do not consume API calls (the main motivation for RemoteTK), RemoteTK has been removed from the toolkit.

* Since the Summer '13 release, the `/services/data` endpoint has been exposed on Visualforce hosts, so no proxy is now required for REST API calls in JavaScript served via Visualforce (although the proxy **is** still required for calls to `/services/apexrest`). `forcetk.js` has been updated to reflect this.

* Inserting or updating blob data using the `create` or `update` functions (passing base64-encoded binary data in JSON) is limited by the REST API to 50 MB of text data or 37.5 MB of base64–encoded data. New functions, `createBlob` and `updateBlob`, allow creation and update of ContentVersion and Document records with binary ('blob') content with a size of up to 500 MB. Here is a minimal sample that shows how to upload a file to Chatter Files:

		<apex:page>
		    <script src="{!$Resource.forcetk_new}"></script>
		    <p>
		        Select a file to upload as a new Chatter File.
		    </p>
		    <input type="file" id="file" onchange="upload()"/>
		    <p id="message"></p>
		    <script>
		        var client = new forcetk.Client();
		        client.setSessionToken('{!$Api.Session_ID}');
		    	function upload() {
		            var file = document.getElementById("file").files[0];
		            client.createBlob('ContentVersion', {
		                Origin: 'H', // 'H' for Chatter File, 'C' for Content Document
		                PathOnClient: file.name
		            }, file.name, 'VersionData', file, function(response){
		                console.log(response);
		                document.getElementById("message").innerHTML = 
		                    "Chatter File created: <a href=\"/" + response.id + "\">Take a look!</a>";
		            }, function(request, status, response){
		                console.log(response);
		                document.getElementById("message").innerHTML = 
		                    "Error: " + status;
		            });
		        }
		    </script>
		</apex:page>

  Under the covers, `createBlob` sends a multipart message. See the REST API doc page [Insert or Update Blob Data](https://www.salesforce.com/us/developer/docs/api_rest/Content/dome_sobject_insert_update_blob.htm) for more details.

Dependencies
------------

The toolkit uses [jQuery](http://jquery.com/). It has been tested on jQuery 1.4.4 and 1.5.2, but other versions may also work.

Configuration
-------------

ForceTK requires that you add the correct REST endpoint hostname for your instance (i.e. https://na1.salesforce.com/ or similar) as a remote site in *Your Name > Administration Setup > Security Controls > Remote Site Settings*.

Using ForceTK in a Visualforce page
-----------------------------------

Create a zip file containing app.js, forcetk.js, jquery.js, and any other static resources your project may need. Upload the zip via *Your Name > App Setup > Develop > Static Resources*.

Your Visualforce page will need to include jQuery and the toolkit, then create a client object, passing a session ID to the constructor. An absolutely minimal sample is:

	<apex:page>
	    <apex:includeScript value="{!URLFOR($Resource.static, 'jquery.js')}" />
	    <apex:includeScript value="{!URLFOR($Resource.static, 'forcetk.js')}"  />
	    <script type="text/javascript">
			// Get an instance of the REST API client and set the session ID
			var client = new forcetk.Client();
			client.setSessionToken('{!$Api.Session_ID}');
        
	        client.query("SELECT Name FROM Account LIMIT 1", function(response){
	            $('#accountname').text(response.records[0].Name);
	        });
	    </script>
	    <p>The first account I see is <span id="accountname"></span>.</p>
	</apex:page>
	
More fully featured samples are provided in [example.page](Force.com-JavaScript-REST-Toolkit/blob/master/example.page) and [mobile.page](Force.com-JavaScript-REST-Toolkit/blob/master/mobile.page). [Watch a brief demo of the samples](http://www.youtube.com/watch?v=qNA8nxfPgBU).

Using the Toolkit in an HTML page outside the Force.com platform
----------------------------------------------------------------

You will need to deploy proxy.php to your server, configuring CORS support (see comments in proxy.php) if your JavaScript is to be hosted on a different server.

Your HTML page will need to include jQuery and the toolkit, then create a client object, passing a session ID to the constructor. An absolutely minimal sample using OAuth to obtain a session ID is:

	<html>
	  <head>
	
		<!-- 
		jQuery - http://docs.jquery.com/Downloading_jQuery
		-->
	    <script type="text/javascript" src="static/jquery.js"></script>
		<!--
		From jQuery-swip - http://code.google.com/p/jquery-swip/source/browse/trunk/jquery.popupWindow.js 
		-->
		<script type="text/javascript" src="static/jquery.popup.js"></script>
	    <script type="text/javascript" src="forcetk.js"></script>
	    <script type="text/javascript">
			// OAuth Configuration
			var loginUrl    = 'https://login.salesforce.com/';
			var clientId    = 'YOUR_CLIENT_ID';
			var redirectUri = 'PATH_TO_YOUR_APP/oauthcallback.html';
			var proxyUrl    = 'PATH_TO_YOUR_APP/proxy.php?mode=native';

			var client = new forcetk.Client(clientId, loginUrl, proxyUrl);

			$(document).ready(function() {
				$('#message').popupWindow({ 
					windowURL: getAuthorizeUrl(loginUrl, clientId, redirectUri),
					windowName: 'Connect',
					centerBrowser: 1,
					height:524, 
					width:675
				});
			});

			function getAuthorizeUrl(loginUrl, clientId, redirectUri){
			    return loginUrl+'services/oauth2/authorize?display=popup'
			        +'&response_type=token&client_id='+escape(clientId)
			        +'&redirect_uri='+escape(redirectUri);
			}
		
			function sessionCallback(oauthResponse) {
			    if (typeof oauthResponse === 'undefined'
			        || typeof oauthResponse['access_token'] === 'undefined') {
			        $('#message').text('Error - unauthorized!');
			    } else {
			        client.setSessionToken(oauthResponse.access_token, null,
			            oauthResponse.instance_url);

				        client.query("SELECT Name FROM Account LIMIT 1", 
				          function(response){
				            $('#message').text('The first account I see is '
				              +response.records[0].Name);
				        });
			    }
			}
	    </script>
	    <p id="message">Click here.</p>
	</html>
	
More fully featured samples are provided in [example.html](Force.com-JavaScript-REST-Toolkit/blob/master/example.html) and [mobile.html](Force.com-JavaScript-REST-Toolkit/blob/master/mobile.html).

Using the Toolkit in a PhoneGap app
-----------------------------------

Your HTML page will need to include jQuery, the toolkit, PhoneGap and the ChildBrowser plugin, then create a client object, passing a session ID to the constructor. You can use __https://login.salesforce.com/services/oauth2/success__ as the redirect URI and catch the page load in ChildBrowser.

An absolutely minimal sample using OAuth to obtain a session ID is:

	<html>
	  <head>
	    <script type="text/javascript" src="static/jquery.js"></script>
	    <script type="text/javascript" src="forcetk.js"></script>
        <script type="text/javascript" src="phonegap.0.9.5.min.js"></script>
        <script type="text/javascript" src="ChildBrowser.js"></script>	    		
        <script type="text/javascript">
			// OAuth Configuration
			var loginUrl    = 'https://login.salesforce.com/';
			var clientId    = 'YOUR_CLIENT_ID';
			var redirectUri = 'https://login.salesforce.com/services/oauth2/success';

			var client = new forcetk.Client(clientId, loginUrl);

			$(document).ready(function() {
                var cb = ChildBrowser.install();
                $('#login').click(function(e) {
                    e.preventDefault();
                    cb.onLocationChange = function(loc){   
                        if (loc.startsWith(redirectUri)) {
                            cb.close();
                            sessionCallback(unescape(loc));
                        }
                    };
                    cb.showWebPage(getAuthorizeUrl(loginUrl, clientId, redirectUri));
                });
			});

			function getAuthorizeUrl(loginUrl, clientId, redirectUri){
			    return loginUrl+'services/oauth2/authorize?display=touch'
			        +'&response_type=token&client_id='+escape(clientId)
			        +'&redirect_uri='+escape(redirectUri);
			}
		
            function sessionCallback(loc) {
                var oauthResponse = {};
                
                var fragment = loc.split("#")[1];
                
                if (fragment) {
                    var nvps = fragment.split('&');
                    for (var nvp in nvps) {
                        var parts = nvps[nvp].split('=');
                        oauthResponse[parts[0]] = unescape(parts[1]);
                    }
                }
                
                if (typeof oauthResponse === 'undefined'
                    || typeof oauthResponse['access_token'] === 'undefined') {
                    errorCallback({
                                  status: 0, 
                                  statusText: 'Unauthorized', 
                                  responseText: 'No OAuth response'
                                  });
                } else {
                    client.setSessionToken(oauthResponse.access_token, null,
				    	oauthResponse.instance_url);
                    
					client.query("SELECT Name FROM Account LIMIT 1", 
						function(response){
						    $('#message').text('The first account I see is '
							+response.records[0].Name);
					    }
					);
                }
            }
	    </script>
	    <p id="message">Click here.</p>
	</html>
	
A fully featured sample (including persistence of the OAuth refresh token to the iOS Keychain) is provided in [phonegap.html](Force.com-JavaScript-REST-Toolkit/blob/master/phonegap.html).

