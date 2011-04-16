Force.com JavaScript REST Toolkit
=================================

This minimal toolkit allows JavaScript in Visualforce pages to call the Force.com REST API via the Ajax Proxy, providing an easy-to-use JavaScript wrapper.

Background
----------

Due to the [same origin policy](http://en.wikipedia.org/wiki/Same_origin_policy), JavaScript running in Visualforce pages may not use [XmlHttpRequest](http://en.wikipedia.org/wiki/XMLHttpRequest) to directly invoke the REST API, since Visualforce pages have hostnames of the form abc.na1.visual.force.com, and the REST API endpoints are of the form na1.salesforce.com.

We can work around this restriction by using the [AJAX Proxy](http://www.salesforce.com/us/developer/docs/ajax/Content/sforce_api_ajax_queryresultiterator.htm#ajax_proxy). Since the AJAX proxy is present on all
Visualforce hosts with an endpoint of the form https://abc.na1.visual.force.com/services/proxy, our Visualforce-hosted JavaScript can invoke it, passing the desired resource URL in an HTTP header.

Dependencies
------------

The toolkit uses [jQuery](http://jquery.com/). It has been tested on jQuery 1.4.4, but other versions may also work.

Configuration
-------------

You must add the correct REST endpoint hostname for your instance (i.e. https://na1.salesforce.com/ or similar) as a remote site in *Your Name > Administration Setup > Security Controls > Remote Site Settings*.

Using the Toolkit in a Visualforce page
---------------------------------------

Create a zip file containing app.js, forcetk.js, jquery.js, and any other static resources your project may need. Upload the zip via *Your Name > App Setup > Develop > Static Resources*.

Your Visualforce page will need to include jQuery and the toolkit, then create a client object, passing a session ID to the constructor. An absolutely minimal sample is:

	<apex:page>
	    <apex:includeScript value="{!URLFOR($Resource.static, 'jquery.js')}" />
	    <apex:includeScript value="{!URLFOR($Resource.static, 'forcetk.js')}"  />
	    <script type="text/javascript">
	        // Get a reference to jQuery that we can work with
	        $j = jQuery.noConflict();
        
	        // Get an instance of the REST API client
	        var client = new forcetk.Client('{!$Api.Session_ID}');
        
	        client.query("SELECT Name FROM Account LIMIT 1", function(response){
	            $j('#accountname').html(response.records[0].Name);
	        });
	    </script>
	    <p>The first account I see is <span id="accountname"></span>.</p>
	</apex:page>
	
More fully featured samples are provided in [example.page](https://github.com/metadaddy/Force.com-JavaScript-REST-Toolkit/blob/master/example.page) and [mobile.page](https://github.com/metadaddy/Force.com-JavaScript-REST-Toolkit/blob/master/mobile.page). [Watch a brief demo of the samples](http://www.youtube.com/watch?v=qNA8nxfPgBU).

Using the Toolkit in an HTML page outside the Force.com platform
----------------------------------------------------------------

You will need to deploy proxy.php to your server, configuring CORS support (see comments in proxy.php) if your JavaScript is to be hosted on a different server.

Your HTML page will need to include jQuery and the toolkit, then create a client object, passing a session ID to the constructor. An absolutely minimal sample using OAuth to obtain a session ID is:

	<html>
	  <head>
	    <script type="text/javascript" src="static/jquery.js"></script>
		<script type="text/javascript" src="static/jquery.popup.js"></script>
	    <script type="text/javascript" src="forcetk.js"></script>
	    <script type="text/javascript">
			// OAuth Configuration
			var loginUrl    = 'https://login.salesforce.com/';
			var clientId    = 'YOUR_CLIENT_ID';
			var redirectUri = 'PATH_TO_YOUR_APP/oauthcallback.html';
			var proxyUrl    = 'PATH_TO_YOUR_APP/proxy.php?mode=native';

			// We'll get an instance of the REST API client in a callback 
			// after we do OAuth
			var client = null;

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
			        $('#message').html('Error - unauthorized!');
			    } else {
			        client = new forcetk.Client(oauthResponse.access_token, 
				        null, oauthResponse.instance_url, proxyUrl);

				        client.query("SELECT Name FROM Account LIMIT 1", 
				          function(response){
				            $('#message').html('The first account I see is '
				              +response.records[0].Name);
				        });
			    }
			}
	    </script>
	    <p id="message">Click here.</p>
	</html>
	
More fully featured samples are provided in [example.html](https://github.com/metadaddy/Force.com-JavaScript-REST-Toolkit/blob/master/example.html) and [mobile.html](https://github.com/metadaddy/Force.com-JavaScript-REST-Toolkit/blob/master/mobile.html).
