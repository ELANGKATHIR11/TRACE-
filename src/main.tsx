import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('[TRACE] main.tsx executing...');

window.addEventListener('error', (event) => {
  console.error('[TRACE Global Error]:', event.error || event.message);
  const root = document.getElementById('root');
  if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
    root.innerHTML = `<div style="padding: 24px; font-family: sans-serif; color: #dc2626; background: #fff; border: 2px solid #ef4444; margin: 20px; border-radius: 8px;">
      <h2>Client-Side Script Execution Error</h2>
      <pre style="white-space: pre-wrap; font-size: 13px;">${event.error ? event.error.stack || event.error.message : event.message}</pre>
    </div>`;
  }
});

const container = document.getElementById('root');
if (!container) {
  console.error('[TRACE] Fatal: #root element not found in DOM!');
} else {
  try {
    const root = createRoot(container);
    root.render(<App />);
    console.log('[TRACE] React root rendered successfully.');
  } catch (err: any) {
    console.error('[TRACE] createRoot render error:', err);
    container.innerHTML = `<div style="padding: 24px; font-family: sans-serif; color: #dc2626; background: #fff; border: 2px solid #ef4444; margin: 20px; border-radius: 8px;">
      <h2>React Render Fatal Error</h2>
      <pre style="white-space: pre-wrap; font-size: 13px;">${err?.stack || err?.message}</pre>
    </div>`;
  }
}

