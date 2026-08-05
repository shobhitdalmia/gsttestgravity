import * as React from 'react'
import { createAuthEmailHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'
import { SignupEmail } from '@/lib/email-templates/signup'
import { InviteEmail } from '@/lib/email-templates/invite'
import { MagicLinkEmail } from '@/lib/email-templates/magic-link'
import { RecoveryEmail } from '@/lib/email-templates/recovery'
import { EmailChangeEmail } from '@/lib/email-templates/email-change'
import { ReauthenticationEmail } from '@/lib/email-templates/reauthentication'

// Configuration
const SITE_NAME = "GST Munshi"
const SENDER_DOMAIN = "notify.gstmunshi.com"
const ROOT_DOMAIN = "gstmunshi.com"
const FROM_DOMAIN = "gstmunshi.com"
const SITE_URL = "https://gst-muse-buddy.lovable.app"

const verificationUrl = (email: string, token?: string) => {
  if (!token) return SITE_URL
  const params = new URLSearchParams({ email, token })
  return `${SITE_URL}/verify-email?${params.toString()}`
}

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
// Built lazily: route modules are imported by the server entry on EVERY request,
// so a module-scope throw here (e.g. missing LOVABLE_API_KEY on a self-hosted
// deploy) would turn every page into a 500.
const createHandler = () => createAuthEmailHandler({
  apiKey: process.env['LOVABLE_API_KEY']!,

  from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
  senderDomain: SENDER_DOMAIN,
  sendUrl: process.env['LOVABLE_SEND_URL'],
  emails: {
    signup: {
      subject: 'Confirm your email',
      render: (data) =>
        React.createElement(SignupEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          recipient: data.email,
          confirmationUrl: verificationUrl(data.email, data.token ?? undefined),
          token: data.token ?? '',
        }),
    },
    invite: {
      subject: "You've been invited",
      render: (data) =>
        React.createElement(InviteEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          confirmationUrl: data.url,
        }),
    },
    magiclink: {
      subject: 'Your login link',
      render: (data) =>
        React.createElement(MagicLinkEmail, {
          siteName: SITE_NAME,
          confirmationUrl: data.url,
          token: data.token ?? '',
        }),
    },
    recovery: {
      subject: 'Reset your password',
      render: (data) =>
        React.createElement(RecoveryEmail, {
          siteName: SITE_NAME,
          confirmationUrl: data.url,
          token: data.token ?? '',
        }),
    },
    email_change: {
      subject: 'Confirm your new email',
      render: (data) =>
        React.createElement(EmailChangeEmail, {
          siteName: SITE_NAME,
          oldEmail: data.old_email ?? '',
          email: data.email,
          newEmail: data.new_email ?? '',
          confirmationUrl: data.url,
          token: data.token ?? '',
        }),
    },

    reauthentication: {
      subject: 'Your verification code',
      render: (data) =>
        React.createElement(ReauthenticationEmail, { token: data.token ?? '' }),
    },
  },
})

let handler: ReturnType<typeof createHandler> | undefined

export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => {
        if (!process.env['LOVABLE_API_KEY']) {
          return Response.json({ error: 'Email sending is not configured' }, { status: 503 })
        }
        if (!handler) handler = createHandler()
        return handler(request)
      },
    },
  },
})


