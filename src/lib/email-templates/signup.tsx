import * as React from 'react'
import { Link, Text } from '@react-email/components'

import { CtaButton, EmailLayout, FooterNote, OtpCode, link, text } from './brand'


interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  token,
}: SignupEmailProps) => (
  <EmailLayout
    siteName={siteName}
    preview={`Confirm your email for ${siteName}`}
    heading="Confirm your email"
  >
    <Text style={text}>
      Thanks for signing up for{' '}
      <Link href={siteUrl} style={link}>
        <strong>{siteName}</strong>
      </Link>
      ! Confirm{' '}
      <Link href={`mailto:${recipient}`} style={link}>
        {recipient}
      </Link>{' '}
      to start GST billing.
    </Text>
    <CtaButton href={confirmationUrl}>Verify Email</CtaButton>
    <OtpCode token={token} label="Or enter this 6-digit code" />
    <FooterNote>
      This code expires shortly. If you didn't create an account, you can safely
      ignore this email.
    </FooterNote>
  </EmailLayout>
)

export default SignupEmail
