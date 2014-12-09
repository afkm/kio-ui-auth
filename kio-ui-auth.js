(function() {

	angular.module('kio-ui-auth', ['angular-jwt', 'ui.router'])
	.service('kioUiAuth', function($http, $q, $state, jwtHelper, kioUiAuthConfig) {
		this.debug = kioUiAuthConfig.debug;
		this.authUrl = kioUiAuthConfig.authUrl || undefined;
		this.loginState = kioUiAuthConfig.loginState || 'login';
		this.autoRefresh = kioUiAuthConfig.autoRefresh || { enabled: true, diffInMin: 5 };
		console.assert(this.authUrl !== undefined, 'kio-ui-auth: authUrl must be defined in kioUiAuthConfig!');
		var config = this;
		return {
			_deleteToken: function() {
				delete localStorage.jwt;
			},
			_setToken: function(jwt) {
				localStorage.jwt = jwt;
				return true;
			},
			_authenticate: function(credentials) {
				return $http({
					url: config.authUrl + '/login',
					skipAuthentication: true,
					method: 'POST',
					data: credentials
				});
			},
			_initAutoRefresh: function() {
				var _this = this,
					exp = jwtHelper.getTokenExpirationDate(_this.getToken());
				if (exp) {
					var now = new Date().getTime(),
						refreshAt = new Date(exp - config.autoRefresh.diffInMin*60*1000),
						refreshDiff = refreshAt.getTime() - now;
					if (config.debug) {
						console.groupCollapsed('kio-ui-auth: Initialize token auto refresh');
						console.log('time now',(new Date(now)));
						console.log('token expires at',(new Date(exp)));
						console.log('token auto refresh at',(new Date(exp)));
						console.log('refresh in min',(new Date(refreshDiff).getMinutes()));
						console.groupEnd();
					}
					config.autoRefresh.timer = setTimeout(function() {
						_this.refreshToken();
					}, refreshDiff);
				}
			},
			getToken: function() {
				var jwt = localStorage.getItem('jwt');
				return (jwt) ? jwt : undefined;
			},
			getDefault: function(param) {
				return (param) ? config[param] : config;
			},
			getProfile: function(param) {
				var _this = this,
					token = _this.getToken(),
					profile = (token) ? jwtHelper.decodeToken(token) : undefined;
				if (profile) {
					return (param) ? profile[param] : profile;
				}
			},
			refreshToken: function() {
				var _this = this;
				return $http.post(config.authUrl + '/refresh').then(function(response) {
					var jwt = response.data.token;
					_this._setToken(jwt);
				});
			},
			login: function(credentials) {
				var _this = this;
				var deferred = $q.defer();
				this._authenticate(credentials).then(function(response) {
					var jwt = response.data.token;
					if (jwt && _this._setToken(jwt)) {
						if (config.autoRefresh.enabled) {
							_this._initAutoRefresh();
						}
						deferred.resolve();
					} else {
						deferred.reject(response);
					}
				}, function(response) {
					deferred.reject(response);
				});
				return deferred.promise;
			},
			logout: function() {
				var _this = this;
				_this._deleteToken();
				if (config.autoRefresh.enabled && config.autoRefresh.timer) {
					clearTimeout(config.autoRefresh.timer);
				}
				$http.post(config.authUrl + '/logout');
				$state.go(config.loginState);
			},
			isLoggedIn: function() {
				var _this = this;
				var jwt = _this.getToken();
				return (jwt) ? !jwtHelper.isTokenExpired(jwt) : false;
			}
		};
	})
	.config(function($httpProvider, jwtInterceptorProvider) {
		jwtInterceptorProvider.tokenGetter = function() {
			var jwt = localStorage.getItem('jwt');
			return jwt;
		};
		$httpProvider.interceptors.push('jwtInterceptor');
	})
	.run(function($rootScope, $state, kioUiAuth) {
		$rootScope.$on('$stateChangeStart', function(e, toState, toStateParams, fromState, fromStateParams) {
			if (kioUiAuth.getDefault('debug')) {
				console.groupCollapsed('kio-ui-auth: State request');
				console.log('requested state:',toState.name);
				console.log('state needs auth:',((typeof toState.authenticate === 'undefined') ? false : toState.authenticate));
				console.log('logged in:',kioUiAuth.isLoggedIn());
				console.log('redirect to login:',(toState.authenticate && !kioUiAuth.isLoggedIn()));
				console.groupEnd();
			}
			$rootScope.isUserLoggedIn = kioUiAuth.isLoggedIn();
			if (toState.authenticate && !kioUiAuth.isLoggedIn()) {
				$rootScope.toState = toState;
				$rootScope.toStateParams = toStateParams;
				e.preventDefault();
				$state.go(kioUiAuth.getDefault('loginState'));
			}
		});
		$rootScope.$on('unauthenticated', function() {
			kioUiAuth.logout();
		});
		$rootScope.logout = function() {
			kioUiAuth.logout();
		};
	});
}());