import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initAppearance } from '@/lib/themes.js'

initAppearance();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)