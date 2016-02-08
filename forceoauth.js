"use strict";

let // The login URL for the OAuth process
    // To override default, pass loginURL in init(props)
    loginURL = 'https://login.salesforce.com',

    // The Connected App client Id. Default app id provided - Not for production use.
    // This application supports http://localhost:8200/oauthcallback.html as a valid callback URL
    // To override default, pass appId in init(props)
    appId = '3MVG9fMtCkV6eLheIEZplMqWfnGlf3Y.BcWdOf1qytXo9zxgbsrUbS.ExHTgUPJeb3jZeT8NYhc.hMyznKU92',

    // The force.com API version to use.
    // To override default, pass apiVersion in init(props)
    apiVersion = 'v35.0',

    // Keep track of OAuth data (access_token, refresh_token, and instance_url)
    oauthData,

    // By default we store fbtoken in sessionStorage. This can be overridden in init()
    tokenStore = {},

    // if page URL is http://localhost:3000/myapp/index.html, context is /myapp
    context = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/")),

    // if page URL is http://localhost:3000/myapp/index.html, serverURL is http://localhost:3000
    serverURL = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : ''),

    // if page URL is http://localhost:3000/myapp/index.html, baseURL is http://localhost:3000/myapp
    baseURL = serverURL + context,

    // Only required when using REST APIs in an app hosted on your own server to avoid cross domain policy issues
    // To override default, pass proxyURL in init(props)
    proxyURL = baseURL,

    // if page URL is http://localhost:3000/myapp/index.html, oauthCallbackURL is http://localhost:3000/myapp/oauthcallback.html
    // To override default, pass oauthCallbackURL in init(props)
    oauthCallbackURL = baseURL + '/oauthcallback.html',

    // Whether or not to use a CORS proxy. Defaults to false if app running in Cordova, in a VF page,
    // or using the Salesforce console. Can be overriden in init()
    useProxy = (window.SfdcApp || window.sforce) ? false : true;

let parseQueryString = queryString => {
    let qs = decodeURIComponent(queryString),
        obj = {},
        params = qs.split('&');
    params.forEach(param => {
        let splitter = param.split('=');
        obj[splitter[0]] = splitter[1];
    });
    return obj;
};

let toQueryString = obj => {
    let parts = [],
        i;
    for (i in obj) {
        if (obj.hasOwnProperty(i)) {
            parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
        }
    }
    return parts.join("&");
};

let refreshToken = () => new Promise((resolve, reject) => {

    if (!oauthData.refresh_token) {
        console.log('ERROR: refresh token does not exist');
        reject();
        return;
    }

    let xhr = new XMLHttpRequest(),

        params = {
            'grant_type': 'refresh_token',
            'refresh_token': oauthData.refresh_token,
            'client_id': appId
        },

        url = useProxy ? proxyURL : loginURL;

    url = url + '/services/oauth2/token?' + toQueryString(params);

    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                console.log('Token refreshed');
                let res = JSON.parse(xhr.responseText);
                oauthData.access_token = res.access_token;
                tokenStore.forceOAuth = JSON.stringify(oauthData);
                resolve();
            } else {
                console.log('Error while trying to refresh token: ' + xhr.responseText);
                reject();
            }
        }
    };

    xhr.open('POST', url, true);
    if (!useProxy) {
        xhr.setRequestHeader("Target-URL", loginURL);
    }
    xhr.send();

});

/**
 * Initialize ForceJS
 * @param params
 *  appId (optional)
 *  loginURL (optional)
 *  proxyURL (optional)
 *  oauthCallbackURL (optional)
 *  apiVersion (optional)
 *  accessToken (optional)
 *  instanceURL (optional)
 *  refreshToken (optional)
 */
export let init = params => {

    if (params) {
        appId = params.appId || appId;
        apiVersion = params.apiVersion || apiVersion;
        loginURL = params.loginURL || loginURL;
        oauthCallbackURL = params.oauthCallbackURL || oauthCallbackURL;
        proxyURL = params.proxyURL || proxyURL;
        useProxy = params.useProxy === undefined ? useProxy : params.useProxy;

        if (params.accessToken) {
            if (!oauthData) oauthData = {};
            oauthData.access_token = params.accessToken;
        }

        if (params.instanceURL) {
            if (!oauthData) oauthData = {};
            oauthData.instance_url = params.instanceURL;
        }

        if (params.refreshToken) {
            if (!oauthData) oauthData = {};
            oauthData.refresh_token = params.refreshToken;
        }
    }

    console.log("useProxy: " + useProxy);

};

/**
 * Discard the OAuth access_token. Use this function to test the refresh token workflow.
 */
export let discardToken = () => {
    delete oauthData.access_token;
    tokenStore.forceOAuth = JSON.stringify(oauthData);
};

export let login = () => new Promise((resolve, reject) => {

    console.log('loginURL: ' + loginURL);
    console.log('oauthCallbackURL: ' + oauthCallbackURL);

    let loginWindowURL = loginURL + '/services/oauth2/authorize?client_id=' + appId + '&redirect_uri=' + oauthCallbackURL + '&response_type=token';

    document.addEventListener("oauthCallback", (event) => {

        // Parse the OAuth data received from Salesforce
        let url = event.detail,
            queryString,
            obj;

        if (url.indexOf("access_token=") > 0) {
            queryString = url.substr(url.indexOf('#') + 1);
            obj = parseQueryString(queryString);
            oauthData = obj;
            tokenStore.forceOAuth = JSON.stringify(oauthData);
            resolve(oauthData);
        } else if (url.indexOf("error=") > 0) {
            queryString = decodeURIComponent(url.substring(url.indexOf('?') + 1));
            obj = parseQueryString(queryString);
            reject(obj);
        } else {
            reject({status: 'access_denied'});
        }

    });

    window.open(loginWindowURL, '_blank', 'location=no');

});

/**
 * Gets the user's ID (if logged in)
 * @returns {string} | undefined
 */
export let getUserId = () => (typeof(oauthData) !== 'undefined') ? oauthData.id.split('/').pop() : undefined;

/**
 * Get the OAuth data returned by the Salesforce login process
 */
export let getOAuthData = () => oauthData;

/**
 * Check the login status
 * @returns {boolean}
 */
export let isAuthenticated = () => (oauthData && oauthData.access_token) ? true : false;