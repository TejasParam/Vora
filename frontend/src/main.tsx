import React from 'react'
import ReactDOM from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import App from './App'
import './index.css'
import { auth0Config } from './auth0-config'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Auth0Provider
      domain="dev-sb5f12qflr42rjzm.us.auth0.com"
      clientId="mOUBvDOk1vJwYvI5OfF8KQhieXc5JQtX"
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: "https://dev-sb5f12qflr42rjzm.us.auth0.com/api/v2/",
        scope: "openid profile email"
      }}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>,
)
