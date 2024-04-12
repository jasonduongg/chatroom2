import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleOAuthProvider clientId="412092131036-2bae3adg3ubbmuooqg87jl55ktfitb0u.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);
