Force.com JavaScript REST Toolkit
=================================

This minimal toolkit allows JavaScript in Visualforce pages to call the Force.com REST API via the Ajax Proxy.

Background
----------

Due to the [same origin policy](http://en.wikipedia.org/wiki/Same_origin_policy), JavaScript running in Visualforce pages may not use XmlHttpRequest to directly invoke the REST API, since Visualforce pages have hostnames of the form abc.na1.visual.force.com, and the REST API endpoints are of the form na1.salesforce.com.

We can work around this restriction by using the [AJAX Proxy](http://www.salesforce.com/us/developer/docs/ajax/Content/sforce_api_ajax_queryresultiterator.htm#ajax_proxy). Since the AJAX proxy is present on all
Visualforce hosts with an endpoint of the form https://abc.na1.visual.force.com/services/proxy, our Visualforce-hosted JavaScript can invoke it, passing the desired resource URL in an HTTP header.

Dependencies
------------

The toolkit uses jQuery. It has been tested on jQuery 1.4.4, but other versions may also work.

Configuration
-------------

You must add the correct REST endpoint hostname for your instance (i.e. https://na1.salesforce.com/ or similar) as a remote site in *Your Name > Administration Setup > Security Controls > Remote Site Settings*.

Using the Toolkit
-----------------

Create a zip file containing forcetk.js, jquery.js, and any other static resources your project may need. Upload the zip via *Your Name > App Setup > Develop > Static Resources*.

Your Visualforce page will need to include jQuery and the toolkit, then create a client object, passing a session ID to the constructor. An absolutely minimal sample is:

	<apex:page>
	    <apex:includeScript value="{!URLFOR($Resource.static, 'jquery.js')}" />
	    <apex:includeScript value="{!URLFOR($Resource.static, 'forcetk.js')}"  />
	    <script type="text/javascript">
	        // Get a reference to jQuery that we can work with
	        $j = jQuery.noConflict();
        
	        // Get an instance of the REST API client
	        var client = new forcetk.Client('{!$Api.Session_ID}');
        
	        client.query("SELECT Name FROM Account LIMIT 1",function(response){
	            $j('#accountlist').html(response.records[0].Name);
	        });
	    </script>
	    <p>The first account I see is <span id="accountlist"></span>.</p>
	</apex:page>
	
A much more fully featured sample is provided in `example.page`.