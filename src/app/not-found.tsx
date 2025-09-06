export default function NotFound() {
  return (
    <html>
      <head>
        <title>404 - Page Not Found | DressUp</title>
        <meta name="description" content="The page you are looking for could not be found." />
      </head>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom right, rgb(147, 51, 234), rgb(219, 39, 119))',
          margin: 0,
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            textAlign: 'center',
            color: 'white',
            padding: '2rem'
          }}>
            <h1 style={{ fontSize: '4rem', fontWeight: 'bold', marginBottom: '1rem' }}>404</h1>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Page Not Found</h2>
            <p style={{ fontSize: '1.125rem', marginBottom: '2rem', opacity: 0.9 }}>
              The page you're looking for doesn't exist or has been moved.
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                background: 'white',
                color: 'rgb(147, 51, 234)',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'background-color 0.2s'
              }}
            >
              Return Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}