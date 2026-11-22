import "./kieu-dang/toan-cuc.css"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from "./ung-dung/App.jsx"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
