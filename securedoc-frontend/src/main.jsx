import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { Web3Provider } from './context/Web3Context.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Web3Provider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#f9f8f6',
                color: '#1a1917',
                border: '1px solid #d4d1cb',
                borderRadius: '4px',
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '14px',
                boxShadow: '0 4px 16px oklch(20% 0.01 60 / 0.12)',
                padding: '12px 16px',
              },
              success: {
                iconTheme: { primary: '#1a6b3a', secondary: '#eaf5ee' },
              },
              error: {
                iconTheme: { primary: '#8b1a1a', secondary: '#fdf0f0' },
              },
            }}
          />
        </Web3Provider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
