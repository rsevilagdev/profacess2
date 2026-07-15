import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initAppearance } from '@/lib/themes.js'
import { registerServiceWorker } from '@/lib/push-manager.js'

initAppearance();
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)