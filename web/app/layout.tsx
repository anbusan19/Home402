import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Casa — Autonomous Home Agent',
  description: 'Order anything from home, hands-free.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
