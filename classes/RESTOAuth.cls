@RestResource(urlMapping='/oauth')
global with sharing class RESTOAuth {
	// GreatVines Mobile Connected App in gvp packaging org
	global static String consumerKey = '3MVG9yZ.WNe6byQDn_tc_.9aCjshsKxMbRn60eJe_2t1IM4.SGEax4oglQXP8FFyZQCAlE4FWziXLvtvg_y1y';
	global static String consumerSecret = '130878638597225461';
	global static String redirectUri = 'https://mobile.greatvines.com/services/apexrest/oauth';

	global static Map<String,Object> callout(String url, String body) {
		HttpRequest callout = new HttpRequest();
		callout.setEndpoint(url);
		callout.setMethod('POST');
		callout.setbody(body);
		Http http = new Http();
		HTTPResponse calloutResponse;
		String calloutResponseBody;
		if (!Test.isRunningTest()) {
			calloutResponse = http.send(callout);
			calloutResponseBody = calloutResponse.getBody();
		} else {
			calloutResponse = new HTTPResponse();
			calloutResponseBody = '{ "access_token" : "test", "id" : "test", "instance_url" : "test", "refresh_token" : "test" }';
		}
		Map<String,Object> calloutResponseJsonMap = (Map<String,Object>)Json.deserializeUntyped(calloutResponseBody);
		return calloutResponseJsonMap;
	}

	// Token Request
	@HttpGet
	global static void doGet() {
		RestRequest req = RestContext.request;
		RestResponse res = RestContext.response;
		if (res == null) {
			res = new RestResponse();
			RestContext.response = res;
		}

		String code = req.params.get('code');
		if (code == NULL) {
			code = 'NULL';
		}
		String state = req.params.get('state');
		Boolean stateSandbox = false;
		String stateRedirectUri = '';
		String loginHost = '';
		if (state != NULL) {
			state = EncodingUtil.urlDecode(state, 'UTF-8');
			Map<String,Object> jsonMap = (Map<String,Object>)Json.deserializeUntyped(state);
			stateSandbox = (Boolean)jsonMap.get('sandbox');
			stateRedirectUri = (String)jsonMap.get('redirectUri');
			loginHost = (String)jsonMap.get('login_host');
		}

		String origin = 'https://greatvines.cloudforce.com';
		if ((stateSandbox != NULL) && (stateSandbox == true)) {
			origin = 'https://test.salesforce.com';
		}
		String endpoint = origin + '/services/oauth2/token';
		String body = 'grant_type=authorization_code&code=' + code + '&client_id=' + consumerKey + '&client_secret=' + consumerSecret + '&redirect_uri=' + redirectUri;
		Map<String,Object> calloutResponseJsonMap = callout(endpoint, body);

		String accessToken = (String)calloutResponseJsonMap.get('access_token');
		String idUrl = (String)calloutResponseJsonMap.get('id');
		String instanceUrl = (String)calloutResponseJsonMap.get('instance_url');
		String refreshToken = (String)calloutResponseJsonMap.get('refresh_token');

		String finalRedirectUri = stateRedirectUri;
		if (accessToken != NULL) {
			String ampersand = '&';
			if ((stateRedirectUri.indexOfIgnoreCase('localhost') < 0) && (stateRedirectUri.indexOfIgnoreCase('greatvines.github.io') < 0) && (stateRedirectUri.indexOfIgnoreCase('app.html') >= 0)) {
				finalRedirectUri = instanceUrl + '/secur/frontdoor.jsp?sid=';
				finalRedirectUri += EncodingUtil.urlEncode(accessToken, 'UTF-8');
				finalRedirectUri += '&retURL=' + EncodingUtil.urlEncode(instanceUrl, 'UTF-8') + '/apex/gvp__GreatVines_App#';
				finalRedirectUri += 'login_host=' + EncodingUtil.urlEncode(loginHost, 'UTF-8');
				ampersand = '%26';
				finalRedirectUri += ampersand;
			} else {
				finalRedirectUri += '#';
			}

			finalRedirectUri += ('access_token=' + EncodingUtil.urlEncode(accessToken, 'UTF-8'));
			finalRedirectUri += (ampersand + 'id=' + EncodingUtil.urlEncode(idUrl, 'UTF-8'));
			finalRedirectUri += (ampersand + 'instance_url=' + EncodingUtil.urlEncode(instanceUrl, 'UTF-8'));
			finalRedirectUri += (ampersand + 'refresh_token=' + EncodingUtil.urlEncode(refreshToken, 'UTF-8'));
			if ((stateSandbox != NULL) && (stateSandbox == true)) {
				finalRedirectUri += (ampersand + 'sandbox=' + EncodingUtil.urlEncode('true', 'UTF-8'));
			}
		} else {
			if ((stateSandbox != NULL) && (stateSandbox == true)) {
				finalRedirectUri += ('#' + 'sandbox=' + EncodingUtil.urlEncode('true', 'UTF-8'));
			}
		}

		res.addHeader('Content-Type', 'text/plain');
		res.addHeader('Location', finalRedirectUri);
		//Redirect
		res.statusCode = 302;
		//res.responseBody = Blob.valueOf(finalRedirectUri);
	}

	// Token Refresh
	@HttpPost
	global static void doPost(String refresh_token, Boolean sandbox) {
		RestResponse res = RestContext.response;
		if (res == null) {
			res = new RestResponse();
			RestContext.response = res;
		}

		String origin = 'https://greatvines.cloudforce.com';
		if ((sandbox != NULL) && (sandbox == true)) {
			origin = 'https://test.salesforce.com';
		}
		String endpoint = origin + '/services/oauth2/token';
		String body = 'grant_type=refresh_token&refresh_token=' + refresh_token + '&client_id=' + consumerKey + '&client_secret=' + consumerSecret + '&redirect_uri=' + redirectUri;
		Map<String,Object> calloutResponseJsonMap = callout(endpoint, body);

		res.addHeader('Content-Type', 'application/json');
		res.responseBody = Blob.valueOf(Json.serialize(calloutResponseJsonMap));
	}
}
