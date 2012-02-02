<?PHP

// Script: Simple PHP Proxy: Get external HTML, JSON and more!
//
// *Version: 2.0, Last updated: 4/15/2011*
// 
// Original locations:
// Project Home - http://benalman.com/projects/php-simple-proxy/
// GitHub       - http://github.com/cowboy/php-simple-proxy/
// Source       - http://github.com/cowboy/php-simple-proxy/raw/master/ba-simple-proxy.php
// 
// About: License
// 
// Copyright (c) 2010 "Cowboy" Ben Alman,
// Dual licensed under the MIT and GPL licenses.
// http://benalman.com/about/license/
//
// Modified to match semantics of Force.com Ajax Proxy as part of the 
// Force.com JavaScript REST Toolkit to allow JavaScript outside the platform
// to use the Force.com REST API.
// 
// About: Examples
// 
// This working example, complete with fully commented code, illustrates one way
// in which this PHP script can be used.
// 
// Simple - http://benalman.com/code/projects/php-simple-proxy/examples/simple/
// 
// About: Release History
// 
// 2.0   (4/15/2011) Modified to work like the Force.com Ajax Proxy so that
//       JavaScript apps can access the Force.com REST API from outside the
//       platform.
// 1.6 - (1/24/2009) Now defaults to JSON mode, which can now be changed to
//       native mode by specifying ?mode=native. Native and JSONP modes are
//       disabled by default because of possible XSS vulnerability issues, but
//       are configurable in the PHP script along with a url validation regex.
// 1.5 - (12/27/2009) Initial release
// 
// Topic: GET Parameters
// 
// Certain GET (query string) parameters may be passed into ba-simple-proxy.php
// to control its behavior, this is a list of these parameters. 
// 
//   url - The remote URL resource to fetch. Any GET parameters to be passed
//     through to the remote URL resource must be urlencoded in this parameter.
//   mode - If mode=native, the response will be sent using the same content
//     type and headers that the remote URL resource returned. If omitted, the
//     response will be JSON (or JSONP). <Native requests> and <JSONP requests>
//     are disabled by default, see <Configuration Options> for more information.
//   callback - If specified, the response JSON will be wrapped in this named
//     function call. This parameter and <JSONP requests> are disabled by
//     default, see <Configuration Options> for more information.
//   user_agent - This value will be sent to the remote URL request as the
//     `User-Agent:` HTTP request header. If omitted, the browser user agent
//     will be passed through.
//   send_cookies - If send_cookies=1, all cookies will be forwarded through to
//     the remote URL request.
//   send_session - If send_session=1 and send_cookies=1, the SID cookie will be
//     forwarded through to the remote URL request.
//   full_headers - If a JSON request and full_headers=1, the JSON response will
//     contain detailed header information.
//   full_status - If a JSON request and full_status=1, the JSON response will
//     contain detailed cURL status information, otherwise it will just contain
//     the `http_code` property.
// 
// Topic: POST Parameters
// 
// All POST parameters are automatically passed through to the remote URL
// request.
// 
// Topic: JSON requests
// 
// This request will return the contents of the specified url in JSON format.
// 
// Request:
// 
// > ba-simple-proxy.php?url=http://example.com/
// 
// Response:
// 
// > { "contents": "<html>...</html>", "headers": {...}, "status": {...} }
// 
// JSON object properties:
// 
//   contents - (String) The contents of the remote URL resource.
//   headers - (Object) A hash of HTTP headers returned by the remote URL
//     resource.
//   status - (Object) A hash of status codes returned by cURL.
// 
// Topic: JSONP requests
// 
// This request will return the contents of the specified url in JSONP format
// (but only if $enable_jsonp is enabled in the PHP script).
// 
// Request:
// 
// > ba-simple-proxy.php?url=http://example.com/&callback=foo
// 
// Response:
// 
// > foo({ "contents": "<html>...</html>", "headers": {...}, "status": {...} })
// 
// JSON object properties:
// 
//   contents - (String) The contents of the remote URL resource.
//   headers - (Object) A hash of HTTP headers returned by the remote URL
//     resource.
//   status - (Object) A hash of status codes returned by cURL.
// 
// Topic: Native requests
// 
// This request will return the contents of the specified url in the format it
// was received in, including the same content-type and other headers (but only
// if $enable_native is enabled in the PHP script).
// 
// Request:
// 
// > ba-simple-proxy.php?url=http://example.com/&mode=native
// 
// Response:
// 
// > <html>...</html>
// 
// Topic: Notes
// 
// * Assumes magic_quotes_gpc = Off in php.ini
// 
// Topic: Configuration Options
// 
// These variables can be manually edited in the PHP file if necessary.
// 
//   $enable_jsonp - Only enable <JSONP requests> if you really need to. If you
//     install this script on the same server as the page you're calling it
//     from, plain JSON will work. Defaults to false.
//   $enable_native - You can enable <Native requests>, but you should only do
//     this if you also whitelist specific URLs using $valid_url_regex, to avoid
//     possible XSS vulnerabilities. Defaults to false.
//     Force.com JavaScript REST Toolkit sets this to true, since it needs
//     native mode, and sets $valid_url_regex appropriately.
//   $valid_url_regex - This regex is matched against the url parameter to
//     ensure that it is valid. This setting only needs to be used if either
//     $enable_jsonp or $enable_native are enabled. Defaults to '/.*/' which
//     validates all URLs.
//     Force.com JavaScript REST Toolkit sets this to 
//     '/https:\/\/.*salesforce.com/' to constrain URLs to end with 
//     salesforce.com
//   $url_query_param - set this to the name of the query string parameter in
//     which to pass the target URL, or null if you want to pass the URL as a
//     header.
//   $url_header - set this to the name of the HTTP header in which to pass 
//     the target URL, or null if you want to pass the URL as a query string
//     parameter.
//     Force.com JavaScript REST Toolkit sets this to 
//     'HTTP_SALESFORCEPROXY_ENDPOINT' to match the Ajax proxy.
//   $authz_header - HTTP header in which authorization data is passed. This
//     will be used for the outgoing Authorization header.
//     Force.com JavaScript REST Toolkit sets this to 'AUTHORIZATION'
//   $cors_allow_origin - origins to allow for Cross Origin Resource Sharing.
//     Set this to match the location of the JavaScript - e.g. 
//     'https://www.myserver.com/'
//   $cors_allow_methods - HTTP methods to allow for CORS - you shouldn't need
//     to change this.
//   $cors_allow_headers - HTTP headers to allow for CORS - you might need to
//     change Authorization if you pass auth data in another header.
// 
// ############################################################################

// Change these configuration options if needed, see above descriptions for info.
$enable_jsonp    = false;
$enable_native   = true;
$valid_forcecom_url_regex = '/https:\/\/.*.salesforce.com/';
$valid_databasecom_url_regex = '/https:\/\/.*database.com/';


$url_query_param = null; // 'url'
$url_header = 'HTTP_SALESFORCEPROXY_ENDPOINT';

$authz_header = 'HTTP_X_AUTHORIZATION';

$return_all_headers = true;

$cors_allow_origin  = null;
$cors_allow_methods = 'GET, POST, PUT, PATCH, DELETE, HEAD';
$cors_allow_headers = 'Authorization, Content-Type';

// ############################################################################

$status = array();

if ( $url_query_param != null ) {
	$url = isset($_GET[$url_query_param]) ? $_GET[$url_query_param] : null;
} else if ( $url_header != null ) {
	$url = isset($_SERVER[$url_header]) ? $_SERVER[$url_header] : null;
} else {
	$url = null;
}

if ( !$url ) {
  
  // Passed url not specified.
  $contents = 'ERROR: url not specified';
  $status['http_code'] = 400;
  $status['status_text'] = 'Bad Request';
  
} else if ( !preg_match( $valid_forcecom_url_regex, $url ) && !preg_match( $valid_databasecom_url_regex, $url )) {
  
  // Passed url doesn't match $valid_url_regex.
  $contents = 'ERROR: invalid url';
  $status['http_code'] = 400;
  $status['status_text'] = 'Bad Request';

} else {

  if ( isset( $cors_allow_origin ) ) {
    header( 'Access-Control-Allow-Origin: '.$cors_allow_origin );
    if ( isset( $cors_allow_methods ) ) {
      header( 'Access-Control-Allow-Methods: '.$cors_allow_methods );
    }
    if ( isset( $cors_allow_headers ) ) {
      header( 'Access-Control-Allow-Headers: '.strtolower($cors_allow_headers) );
    }
    if ( isset($_SERVER['REQUEST_METHOD']) && 
        ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') ) {
      // We're done - don't proxy CORS OPTIONS request
      exit();
	}
  }

  $ch = curl_init( $url );

  // Pass on request method, regardless of what it is
  curl_setopt( $ch, CURLOPT_CUSTOMREQUEST, 
      isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET' );

  // Pass on content, regardless of request method
  if ( isset($_SERVER['CONTENT_LENGTH'] ) && $_SERVER['CONTENT_LENGTH'] > 0 ) {
    curl_setopt( $ch, CURLOPT_POSTFIELDS, file_get_contents("php://input") );
  }

  if ( isset($_GET['send_cookies']) ) {
    $cookie = array();
    foreach ( $_COOKIE as $key => $value ) {
      $cookie[] = $key . '=' . $value;
    }
    if ( isset($_GET['send_session']) ) {
      $cookie[] = SID;
    }
    $cookie = implode( '; ', $cookie );
    
    curl_setopt( $ch, CURLOPT_COOKIE, $cookie );
  }

  $headers = array();
  if ( isset($authz_header) && isset($_SERVER[$authz_header]) ) {
    // Set the Authorization header
    array_push($headers, "Authorization: ".$_SERVER[$authz_header] );
  }
  if ( isset($_SERVER['CONTENT_TYPE']) ) {
	// Pass through the Content-Type header
	array_push($headers, "Content-Type: ".$_SERVER['CONTENT_TYPE'] );
  }	
  if ( isset($_SERVER['HTTP_X_USER_AGENT']) ) {
	// Pass through the X-User-Agent header
	array_push($headers, "X-User-Agent: ".$_SERVER['HTTP_X_USER_AGENT'] );
  }
  if ( isset($_SERVER['HTTP_X_FORWARDED_FOR']) ) {
	array_push($headers, $_SERVER['HTTP_X_FORWARDED_FOR'].", ".$_SERVER['HTTP_X_USER_AGENT'] );
  } else if (isset($_SERVER['REMOTE_ADDR'])) {
	array_push($headers, "X-Forwarded-For: ".$_SERVER['REMOTE_ADDR'] );
  }

  if ( count($headers) > 0 ) {
	curl_setopt( $ch, CURLOPT_HTTPHEADER, $headers );
  }
  
  curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, true );
  curl_setopt( $ch, CURLOPT_HEADER, true );
  curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
  
  curl_setopt( $ch, CURLOPT_USERAGENT, 
	isset($_GET['user_agent']) ? $_GET['user_agent'] : $_SERVER['HTTP_USER_AGENT'] );
  
  list( $header, $contents ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
  
  $status = curl_getinfo( $ch );
  
  if ( curl_errno( $ch ) ) {
    $status['http_code'] = 500;
    $contents = "cURL error ".curl_errno( $ch ).": ".curl_error( $ch )."\n";
  }
  
  curl_close( $ch );
}

// Split header text into an array.
$header_text = isset($header) ? preg_split( '/[\r\n]+/', $header ) : array();

if ( isset($_GET['mode']) && $_GET['mode'] == 'native' ) {
  if ( !$enable_native ) {
    $contents = 'ERROR: invalid mode';
    $status['http_code'] = 400;
    $status['status_text'] = 'Bad Request';
  }

  if ( isset( $status['http_code'] ) ) {
      $header = "HTTP/1.1 ".$status['http_code'];
      if (isset($status['status_text'])) {
          $header .= " ".$status['status_text'];
      }
      header( $header );

      $header_match = '/^(?:Content-Type|Content-Language|Set-Cookie)/i';
  } else {
      $header_match = '/^(?:HTTP|Content-Type|Content-Language|Set-Cookie)/i';
  }
  
  foreach ( $header_text as $header ) {
    if ( preg_match( $header_match, $header ) ) {
      header( $header );
    }
  }

  print $contents;
  
} else {
  
  // $data will be serialized into JSON data.
  $data = array();
  
  // Propagate all HTTP headers into the JSON data object.
  if ( isset($_GET['full_headers']) ) {
    $data['headers'] = array();
    
    foreach ( $header_text as $header ) {
      preg_match( '/^(.+?):\s+(.*)$/', $header, $matches );
      if ( $matches ) {
        $data['headers'][ $matches[1] ] = $matches[2];
      }
    }
  }
  
  // Propagate all cURL request / response info to the JSON data object.
  if ( isset($_GET['full_status']) ) {
    $data['status'] = $status;
  } else {
    $data['status'] = array();
    $data['status']['http_code'] = $status['http_code'];
  }
  
  // Set the JSON data object contents, decoding it from JSON if possible.
  $decoded_json = json_decode( $contents );
  $data['contents'] = $decoded_json ? $decoded_json : $contents;

  // Generate appropriate content-type header.
  $is_xhr = isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
      (strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest');
  header( 'Content-type: application/' . ( $is_xhr ? 'json' : 'x-javascript' ) );
  
  // Get JSONP callback.
  $jsonp_callback = ($enable_jsonp && isset($_GET['callback'])) ? $_GET['callback'] : null;
  
  // Generate JSON/JSONP string
  $json = json_encode( $data );
  
  print $jsonp_callback ? "$jsonp_callback($json)" : $json;

}

?>
