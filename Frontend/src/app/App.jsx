import { BrowserRouter } from 'react-router'
import AppProviders from './providers/AppProviders.jsx'
import AppRoutes from './router/AppRoutes.jsx'

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  )
}
