import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { installRuntimeNetworkFirewall } from './utils/runtimeNetworkFirewall';
import './index.css';

installRuntimeNetworkFirewall();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/seb">
      <App />
    </BrowserRouter>
  </StrictMode>
);
