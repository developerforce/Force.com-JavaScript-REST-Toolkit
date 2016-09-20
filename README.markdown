Force.com JavaScript REST Toolkit
=================================

This minimal toolkit allows JavaScript in web pages to call the Force.com REST API in a number of different ways.

Background
----------

ForceTK provides a convenient, thin JavaScript abstraction of the [Force.com REST API](https://developer.salesforce.com/page/REST_API), making the API more accessible to JavaScript code running in Visualforce, in hybrid mobile apps, and elsewhere.

Due to the [same origin policy](http://en.wikipedia.org/wiki/Same_origin_policy), JavaScript running outside the Force.com Platform may not use [XMLHttpRequest](http://en.wikipedia.org/wiki/XMLHttpRequest) to directly invoke the REST API, so a minimal PHP proxy is provided.

Recent Updates
--------------

[Older Updates](OlderUpdates.md)

Dependencies
------------

The toolkit uses [ECMAScript 6 Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

TBD - Babel

Configuration
-------------

If you are using ForceTK from JavaScript hosted in an 'off platform' web page (for example, in a Heroku app), you will need to add the app's origin (protocol, host and port, for example https://myapp.herokuapp.com/) to your org's [CORS configuration](https://help.salesforce.com/htviewhelpdoc?err=1&id=extend_code_cors.htm&siteLang=en_US).

Using ForceTK in a Visualforce page
-----------------------------------

Create a zip file containing app.js, forcetk.js and any other static resources your project may need. Upload the zip via *Your Name > App Setup > Develop > Static Resources*.

Your Visualforce page will need to include jQuery and the toolkit, then create a client object, passing a session ID to the constructor. An absolutely minimal sample is:

	<apex:page>
	    <apex:includeScript value="{!$Resource.forcetk}" />
	    <script type="text/javascript">
	        // Get an instance of the REST API client and set the session ID
	        var client = new forcetk.Client();
	        client.setSessionToken('{!$Api.Session_ID}');

	        client.query("SELECT Name FROM Account LIMIT 1")
	          .then(function(response){
	            document.getElementById("accountname").textContent = response.records[0].Name;
	          }) 
	          .catch(function(error){ 
	            console.error(error);
	            alert(error);
	          });
	    </script>
	    <p>The first account I see is <span id="accountname"></span>.</p>
	</apex:page>
	
More fully featured samples are provided in [example.page](Force.com-JavaScript-REST-Toolkit/blob/master/example.page) and [mobile.page](Force.com-JavaScript-REST-Toolkit/blob/master/mobile.page). [Watch a brief demo of the samples](http://www.youtube.com/watch?v=qNA8nxfPgBU).

Using the Toolkit in an HTML page outside the Force.com platform
----------------------------------------------------------------

As mentioned above, you will need to [configure CORS](https://help.salesforce.com/htviewhelpdoc?err=1&id=extend_code_cors.htm&siteLang=en_US) to call the Force.com REST API from JavaScript hosted 'off-platform'.

Your HTML page will need to include the toolkit, then create a client object, passing a session ID to the constructor. An absolutely minimal sample using OAuth to obtain a session ID is:

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

TBD - new OAuth!
	
More fully featured samples are provided in [example.html](Force.com-JavaScript-REST-Toolkit/blob/master/example.html) and [mobile.html](Force.com-JavaScript-REST-Toolkit/blob/master/mobile.html).

Using the Toolkit in a Cordova app
----------------------------------

TBD - update for current Cordova!

Your HTML page will need to include the toolkit and Cordova. You will also need to install the [InAppBrowser](http://plugins.cordova.io/#/package/org.apache.cordova.inappbrowser) plugin to be able to pop up a browser window for authentication. Create a client object, passing a session ID to the constructor. You can use __https://login.salesforce.com/services/oauth2/success__ as the redirect URI and catch the page load in InAppBrowser.

An absolutely minimal sample using OAuth to obtain a session ID is:

	<!DOCTYPE html>
	<html>
	  <head>
	    <title>ForceTK Demo</title>
	    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
	    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no;" />
	    <script type="text/javascript" src="js/jquery-1.11.2.min.js"></script>
	    <script type="text/javascript" src="js/forcetk.js"></script>
	    <script type="text/javascript" src="cordova.js"></script>
	    <script type="text/javascript">
			// OAuth Configuration
			var loginUrl    = 'https://login.salesforce.com/';
			var clientId    = '3MVG9Km_cBLhsuPzTtcGHsZpj9HSp.uUwbHupEXhWi6k3JJphEv8swpsUYIFCZSLp8pi7YYMbRjeQUxptYdIt';
			var redirectUri = 'https://login.salesforce.com/services/oauth2/success';

			var client = new forcetk.Client(clientId, loginUrl);

	        // Make our own startsWith utility fn
	        if (!String.prototype.startsWith) {
	          String.prototype.startsWith = function(searchString, position) {
	            position = position || 0;
	            return this.lastIndexOf(searchString, position) === position;
	          };
	        }

			document.addEventListener("deviceready", function(){
	            $('#login').click(function(e) {
	                e.preventDefault();
	                var ref = window.open(getAuthorizeUrl(loginUrl, clientId, redirectUri), 
	                					  '_blank', 'location=no,toolbar=no');
	                ref.addEventListener('loadstop', function(evt) {
	                    if (evt.url.startsWith(redirectUri)) {
	                        ref.close();
	                        sessionCallback(unescape(evt.url));
	                    }
	                });
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
				    alert("Unauthorized: No OAuth response");
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
	  <head>
	  <body>
	    <button id="login">Click here to login</button>
	    <p id="message"></p>
	  </body>
	</html>
	
A fully featured sample (including persistence of the OAuth refresh token to the iOS Keychain) for iOS is provided in [cordova-ios.html](https://github.com/developerforce/Force.com-JavaScript-REST-Toolkit/blob/master/cordova-ios.html). The sample uses Cordova 4.3.0 and the InAppBrowser and iOS Keychain plugins. Install these with

	cordova plugin add org.apache.cordova.inappbrowser
	cordova plugin add com.shazron.cordova.plugin.keychainutil
