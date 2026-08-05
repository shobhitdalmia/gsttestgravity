import * as React from 'react'
import { Link, Text } from '@react-email/components'

import { CtaButton, EmailLayout, FooterNote, link, text } from './brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <EmailLayout
    siteName={siteName}
    preview={`You've been invited to join ${siteName}`}
    heading="You've been invited"
  >
    <Text style={text}>
      You've been invited to join{' '}
      <Link href={siteUrl} style={link}>
        <strong>{siteName}</strong>
      </Link>
      . Accept the invitation to create your account and access the books.
    </Text>
    <CtaButton href={confirmationUrl}>Accept Invitation</CtaButton>
    <FooterNote>
      If you weren't expecting this invitation, you can safely ignore this email.
    </FooterNote>
  </EmailLayout>
)

export default InviteEmail
