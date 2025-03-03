
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Create root outside of any function to avoid recreation
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Failed to find the root element");
}

const root = createRoot(rootElement);

// Wrap in StrictMode for better development experience and error catching
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
