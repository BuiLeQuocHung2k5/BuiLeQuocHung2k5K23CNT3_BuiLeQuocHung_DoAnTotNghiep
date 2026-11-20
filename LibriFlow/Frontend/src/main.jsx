import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from "./ung-dung/App.jsx"
import "./kieu-dang/toan-cuc.css"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
