export class Auth {
	static get auth() {
		return this._auth = this._auth || JSON.parse((window.localStorage && window.localStorage.auth) || null);
	}
	static set auth(auth) {
		if (window.localStorage && !this.loggingOut) {
			if (auth) {
				window.localStorage.setItem('auth', JSON.stringify(Object.assign({}, this.auth, auth)));
				this._auth = null;
				if (!auth.issued_at && this.auth.refresh_token) {
					Auth.refresh();
				}
			} else {
				window.localStorage.removeItem('auth');
				this._auth = null;
			}
		} else if (!this.loggingOut) {
			this._auth = auth;
		}
	}
	static get clientId() {
		// GreatVines Mobile Connected App in gvp packaging org
		return '3MVG9yZ.WNe6byQDn_tc_.9aCjshsKxMbRn60eJe_2t1IM4.SGEax4oglQXP8FFyZQCAlE4FWziXLvtvg_y1y';
	}
	static get loginUrl() {
		return 'https://greatvines.cloudforce.com';
	}
	static get redirectUri() {
		return this.salesforceUri || `${window.location.origin}${window.location.pathname}`;
	}
	static get responseType() {
		return 'code';
		// return 'token';
	}
	static get salesforceUri() {
		return 'https://mobile.greatvines.com/services/apexrest/oauth';
	}
	static get sandboxLoginUrl() {
		return 'https://test.salesforce.com';
	}
	static get scopes() {
		return [
			'api',
			'id',
			'web',
			'refresh_token'
		];
	}

	static async authenticate(options) {
		options = options || {};
		let authArgs = this.parseArgs();
		let auth = await this.auth;
		if ([true, 'true'].includes(Object.assign({}, authArgs, options).logout)) {
			await this.logout();
		} else if (authArgs.access_token && (!auth || (authArgs.access_token !== auth.access_token))) {
			authArgs.login_host = options.login_host;
			authArgs.sandbox = [true, 'true'].includes(Object.assign(authArgs, options).sandbox);
			authArgs.user_id = (authArgs.id || '').split("/").pop();
			auth = this.auth = authArgs;
			// https://salesforce.stackexchange.com/questions/65590/what-causes-a-connected-apps-refresh-token-to-expire/66667
			await Auth.refresh();
		} else if (authArgs.session_id && (!auth || (authArgs.session_id !== auth.session_id))) {
			authArgs.access_token = authArgs.session_id;
			authArgs.instance_url = (authArgs.instance_url && new URL(authArgs.instance_url).origin) || '';
			authArgs.login_host = authArgs.instance_url;
			auth = this.auth = authArgs;
		} else if (window.location.hash && (window.location.hash.length > 1)) {
			window.location.hash = '';
		}
		return auth || (!this.loggingOut && this.redirect(await this.getAuthorizationUrl(Object.assign(authArgs, options))));
	}

	static async getAuthorizationUrl(options) {
		options = options || {};
		return [
			await this.getBaseUrl(options),
			'/services/oauth2/authorize?',
			Object.entries({
				display: 'touch',
				prompt: 'consent',
				response_type: this.responseType,
				client_id: this.clientId,
				redirect_uri: this.redirectUri,
				scope: this.scopes.join(' '),
				state: JSON.stringify({
					redirectUri: `${window.location.origin}${window.location.pathname}${window.location.search}`,
					sandbox: [true, 'true'].includes(options.sandbox),
					login_host: options.login_host || ''
				})
			}).map(([key, value]) => `${key}=${escape(value)}`).join('&')
		].join('');
	}

	static async getBaseUrl(options) {
		options = await Object.assign({}, await this.auth, options || {});
		return options.login_host ?
			(options.login_host.startsWith('http') ? options.login_host : `https://${options.login_host}`) :
			(options.sandbox ? this.sandboxLoginUrl : this.loginUrl);
	}

	static async logout(options) {
		options = options || {};
		if (this.loggingOut) {
			return;
		}
		const auth = await this.auth;
		this.auth = null;
		this.loggingOut = true;
		window.location.hash = window.location.search = '';
		document.execCommand('ClearAuthenticationCache', false);
		if (auth && auth.access_token && auth.instance_url) {
			if (window.location.origin === 'https://mobile.greatvines.com') {
				// retURL doesn't seem to work,
				// so we load the logout url in a hidden iframe
				// and then redirect to the auth url
				const authUrl = await this.getAuthorizationUrl(Object.assign(auth, options));
				let logoutFrame = document.createElement('iframe');
				logoutFrame.style.display = 'none';
				logoutFrame.src = `${auth.instance_url}/secur/logout.jsp?retURL=${encodeURIComponent(authUrl)}`;
				logoutFrame.addEventListener('load', () => this.redirect(authUrl));
				return document.body.appendChild(logoutFrame);
			}
			return this.redirect('https://mobile.greatvines.com?logout=true');
		}
		return this.loggingOut = false;
	}

	static parseArgs(args) {
		args = args || [
			window.location.search.substr(1),
			window.location.hash.substr(1)
		].join('&') || '';
		let nvps = args.split('&');
		return nvps.reduce((parsedArgs, nvp) => {
			let parts = nvp.split('=');
			parsedArgs[parts[0]] = unescape(parts[1]);
			return parsedArgs;
		}, {});
	}

	static redirect(redirectUrl) {
		if (this.redirecting) {
			return;
		}
		this.redirecting = true;
		window.location.href = redirectUrl;
	}

	static async refresh(options) {
		options = options || {};
		if (!(navigator.onLine && this.auth)) {
			return;
		}
		try {
			let refresh = await this.refreshSalesforce(options);
			if (refresh && refresh.access_token) {
				console.log("OAUTH REFRESH:" + JSON.stringify(refresh));
				let auth = await this.auth;
				return this.auth = Object.assign({}, auth, refresh);
			}
		} catch(error) {
			(typeof(App) !== 'undefined') ? App.error(error) : console.log(error);
		}
		if (navigator.onLine) {
			// https://app.liquidplanner.com/space/67058/projects/show/51631662
			// return this.logout();
		}
	}

	static async refreshSalesforce(options) {
		options = options || {};
		if (!this.salesforceUri) {
			return this.refreshToken(options);
		}
		let auth = await this.auth;
		options = Object.assign(auth || {}, options);
		let requestParams = {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				refresh_token: auth && auth.refresh_token,
				sandbox: [true, 'true'].includes(options.sandbox)
			}),
			mode: 'cors'
		};
		return this.request(this.salesforceUri, requestParams);
	}

	static async refreshToken(options) {
		options = options || {};
		let auth = await this.auth;
		let requestParams = {
			method: 'POST',
			headers: { 'Sync-Interval': 0 },
			body: Object.entries({
				client_id: this.clientId,
				grant_type: 'refresh_token',
				refresh_token: auth && auth.refresh_token
			}).reduce((formData, [key, value]) => {
				formData.set(key, value);
				return formData;
			}, new FormData()),
			mode: 'no-cors'
		};
		return this.request(
			`${await this.getBaseUrl(Object.assign(auth || {}, options))}/services/oauth2/token`, requestParams
		);
	}

	static async request(url, options) {
		let response;
		try {
			response = await fetch(url, options);
			return await response.json();
		} catch(error) {
			(typeof(App) !== 'undefined') ? App.error(error) : console.log(error);
			return;
		}
		return {};
	}

	static async revokeToken() {
		let auth = await this.auth;
		if (!(auth && auth.instance_url && auth.access_token)) {
			return;
		}
		let url = `${auth.instance_url}/services/oauth2/revoke?token=${encodeURIComponent(auth && auth.access_token)}`;
		let requestParams = {
			method: 'GET',
			mode: 'no-cors'
		};
		return this.request(url, requestParams);
	}
}
