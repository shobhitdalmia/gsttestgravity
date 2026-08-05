import * as React from 'react'
import { Text } from '@react-email/components'

import { EmailLayout, FooterNote, OtpCode, text } from './brand'

interface ReauthenticationEmailProps {
  siteName?: string
  token: string
}

export const ReauthenticationEmail = ({
  siteName = 'GST Munshi',
  token,
}: ReauthenticationEmailProps) => (
  <EmailLayout
    siteName={siteName}
    preview="Your verification code"
    heading="Confirm reauthentication"
  >
    <Text style={text}>Use the code below to confirm your identity:</Text>
    <OtpCode token={token} label="Verification code" />
    <FooterNote>
      This code will expire shortly. If you didn't request this, you can safely
      ignore this email.
    </FooterNote>
  </EmailLayout>
)

export default ReauthenticationEmail
