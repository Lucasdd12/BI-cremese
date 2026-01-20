/**
 * Email service for sending magic links
 * In development mode, logs the link to console
 * In production, integrate with email service (SendGrid, Resend, etc.)
 */

export async function sendMagicLink(email: string, magicLink: string): Promise<void> {
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (isDevelopment) {
    // In development, log to console
    console.log('\n========================================')
    console.log('🔗 MAGIC LINK (Development Mode)')
    console.log('========================================')
    console.log(`Email: ${email}`)
    console.log(`Magic Link: ${magicLink}`)
    console.log('========================================\n')
    return
  }

  // Production: Send actual email
  // TODO: Integrate with email service
  // Example with Resend:
  // import { Resend } from 'resend'
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'noreply@yourdomain.com',
  //   to: email,
  //   subject: 'Seu link de acesso',
  //   html: `<p>Clique no link para fazer login: <a href="${magicLink}">${magicLink}</a></p>`,
  // })

  throw new Error('Email service not configured for production')
}
