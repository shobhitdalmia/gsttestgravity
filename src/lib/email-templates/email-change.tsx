import * as React from 'react'
import { Link, Text } from '@react-email/components'

import { CtaButton, EmailLayout, FooterNote, OtpCode, link, text } from './brand'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail.
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
  token?: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
  token,
}: EmailChangeEmailProps) => (
  <EmailLayout
    siteName={siteName}
    preview={`Confirm your email change for ${siteName}`}
    heading="Confirm your email change"
  >
    <Text style={text}>
      You requested to change your email address for {siteName} from{' '}
      <Link href={`mailto:${oldEmail}`} style={link}>
        {oldEmail}
      </Link>{' '}
      to{' '}
      <Link href={`mailto:${newEmail}`} style={link}>
        {newEmail}
      </Link>
      .
    </Text>
    <CtaButton href={confirmationUrl}>Confirm Email Change</CtaButton>
    <OtpCode token={token} label="Or enter this 6-digit code" />
    <FooterNote>
      If you didn't request this change, please secure your account immediately.
    </FooterNote>
  </EmailLayout>
)

export default EmailChangeEmail
