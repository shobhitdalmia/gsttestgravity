import * as React from 'react'
import { Text } from '@react-email/components'

import { CtaButton, EmailLayout, FooterNote, OtpCode, text } from './brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => (
  <EmailLayout
    siteName={siteName}
    preview={`Your login link for ${siteName}`}
    heading="Your login link"
  >
    <Text style={text}>
      Click the button below to log in to {siteName}. This link will expire
      shortly.
    </Text>
    <CtaButton href={confirmationUrl}>Log In</CtaButton>
    <OtpCode token={token} label="Or enter this 6-digit code" />
    <FooterNote>
      If you didn't request this link, you can safely ignore this email.
    </FooterNote>
  </EmailLayout>
)

export default MagicLinkEmail
