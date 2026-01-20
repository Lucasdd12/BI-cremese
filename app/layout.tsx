import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BI Estratégico - Lançamento de Medições',
  description: 'Sistema de lançamento de medições de indicadores',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
