import { Auth0ProviderOptions } from '@auth0/auth0-react';

export const auth0Config: Auth0ProviderOptions = {
  domain: "dev-sb5f12qflr42rjzm.us.auth0.com",
  clientId: "mOUBvDOk1vJwYvI5OfF8KQhieXc5JQtX",
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: "https://dev-sb5f12qflr42rjzm.us.auth0.com/api/v2/",
    scope: "openid profile email"
  }
} 