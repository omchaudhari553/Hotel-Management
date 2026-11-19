import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Ensure root documentElement has no data-theme so the Hotel Management app retains its authentic styling
if (typeof document !== 'undefined') {
  document.documentElement.removeAttribute('data-theme');

  // Enforce no future dates on all calendars / date pickers across all modules
  const enforceMaxDate = (el: EventTarget | null) => {
    const input = el as HTMLInputElement;
    if (input && input.tagName === 'INPUT' && input.type === 'date') {
      const today = new Date().toISOString().split('T')[0];
      if (!input.max || input.max > today) {
        input.max = today;
      }
      if (input.value && input.value > today) {
        input.value = today;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };

  document.addEventListener('focusin', (e) => enforceMaxDate(e.target), true);
  document.addEventListener('click', (e) => enforceMaxDate(e.target), true);
  document.addEventListener('change', (e) => enforceMaxDate(e.target), true);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
