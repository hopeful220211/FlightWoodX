import { useState } from 'react'
import { AdminPage } from './AdminPage'
import { AdminGate } from './AdminGate'

export function AdminLayout() {
  const [verified, setVerified] = useState(
    () => !!sessionStorage.getItem('adminAccessKey')
  )

  if (!verified) {
    return <AdminGate onVerified={() => setVerified(true)} />
  }

  return <AdminPage />
}
