import * as React from 'react'
import { Text } from '@react-email/components'

import { CtaButton, EmailLayout, FooterNote, OtpCode, text } from './brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  token,
}: RecoveryEmailProps) => (
  <EmailLayout
    siteName={siteName}
    preview={`Reset your password for ${siteName}`}
    heading="Reset your password"
  >
    <Text style={text}>
      We received a request to reset your password for {siteName}. Click the
      button below to choose a new password.
    </Text>
    <CtaButton href={confirmationUrl}>Reset Password</CtaButton>
    <OtpCode token={token} label="Or enter this 6-digit code" />
    <FooterNote>
      If you didn't request a password reset, you can safely ignore this email —
      your password will not be changed.
    </FooterNote>
  </EmailLayout>
)

export default RecoveryEmail
