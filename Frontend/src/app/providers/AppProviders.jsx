import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '../../lib/query-client.js'
import Toaster from '../../components/ui/Toaster.jsx'

export default function AppProviders({ children }) {
  const [queryClient] = useState(createQueryClient)
  return <QueryClientProvider client={queryClient}>{children}<Toaster /></QueryClientProvider>
}
