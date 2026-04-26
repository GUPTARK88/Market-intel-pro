export const metadata = {
  title: 'Market Intel Pro',
  description: 'Real-time market intelligence dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{margin:0,padding:0,background:'#0f172a'}}>
        {children}
      </body>
    </html>
  )
}
