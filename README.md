KIO UI AUTH
---------------------------------------
version:	0.1
date:		08.12.2014
editor:		Benedikt Dertinger
---------------------------------------


Implementation
---------------------------------------

1. Include kio-ui-auth.js into your app
2. Set kio-ui-auth as dependency

angular.module('appName', ['kio-ui-auth'])

3. Add kioUiAuthConfig as constant to your app

.constant('kioUiAuthConfig', {
	debug: false, 						// Default: -> Must be defined!
	authUrl: 'http://localhost:8000', 	// Default: undefined -> Must be defined!
	loginState: 'login', 				// Default: 'login'
	autoRefresh: {
		enabled: true,	 				// Default: true (activate autom. token refresh)
		diffInMin: 5					// Default: 5 (time before token expiration in minutes)
	}
})

4. Add "authenticate: true" to every state that needs auth

 $stateProvider.state('content', {
	 authenticate: true, // <-- Now only logged in users can access this state
	 ...

5. Add "login" method to your login

$stateProvider.state('login', {
	...
	controller: function(kioUiAuth) {

		kioUiAuth.login($scope.user).then(function(response) { //
			if ($rootScope.toState) {
				// Redirect to requested state
				$state.go($rootScope.toState, $rootScope.toStateParams);
				$rootScope.toState = $rootScope.toStateParams = undefined;
			} else {
				// Default state after login
				$state.go('list');
			}
		}, function(response) {
			// Handle wrong credentials, etc.
			console.log('Login failed', response);
		});
	};
});

6. Add the "logout" method somewhere in your scope to manually logout

kioUiAuth.logout();

7. You're done!



How it work's
---------------------------------------

1. The user authenticates and the api returns a token
2. The client stores the token in the localstorage (domain based)
3. From now on two routines provide a layer of security
	3a. To every server request the token will be added automatically.
  		If the token was tampered or is expired the unauthorized 
  		state 401 will be returned and the user gets logged out (client & server)	 
  	3b. On every state request the local stored token will be checked.
  		If the token expired the user gets logged out (client & server)	 
4. The user can manually logout as well



Design
---------------------------------------

The token has to be valid and should not expire to stay logged in!
This means that restricted areas can only be accessed by logged in 
users which will be stored on server side as well.
To provide high usability the token gets refreshed automatically
by the client (on timeout).



Dependencies
---------------------------------------

angular-jwt		JWT Helper lib from auth0
angular-ui		UI lib