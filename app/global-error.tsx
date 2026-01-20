'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          textAlign: 'center'
        }}>
          <h2>Algo deu errado!</h2>
          <button onClick={() => reset()}>Tentar novamente</button>
        </div>
      </body>
    </html>
  )
}
