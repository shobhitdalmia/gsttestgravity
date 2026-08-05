import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

// GST Munshi brand: deep teal + warm amber on white.
export const brand = {
  teal: '#0d6b63',
  tealDark: '#0a544e',
  amber: '#d97706',
  ink: '#1b2a29',
  muted: '#5c6b6a',
  border: '#e2ece9',
  soft: '#f3faf8',
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
}
const container = { padding: '0', maxWidth: '560px' }
const header = {
  backgroundColor: brand.teal,
  padding: '22px 28px',
  borderRadius: '14px 14px 0 0',
}
const brandText = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  margin: '0',
  letterSpacing: '0.3px',
}
const card = {
  border: `1px solid ${brand.border}`,
  borderTop: 'none',
  borderRadius: '0 0 14px 14px',
  padding: '28px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: brand.ink,
  margin: '0 0 16px',
}
export const text = {
  fontSize: '15px',
  color: brand.muted,
  lineHeight: '1.6',
  margin: '0 0 20px',
}
export const link = { color: brand.teal, textDecoration: 'underline' }
const button = {
  backgroundColor: brand.teal,
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '13px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const codeWrap = {
  backgroundColor: brand.soft,
  border: `1px dashed ${brand.amber}`,
  borderRadius: '12px',
  padding: '18px',
  textAlign: 'center' as const,
  margin: '24px 0 8px',
}
const codeLabel = {
  fontSize: '12px',
  color: brand.muted,
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 8px',
}
const codeValue = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  color: brand.tealDark,
  margin: '0',
}
const footer = {
  fontSize: '12px',
  color: '#96a3a2',
  lineHeight: '1.6',
  margin: '26px 0 0',
}

export const EmailLayout = ({
  siteName,
  preview,
  heading,
  children,
}: {
  siteName: string
  preview: string
  heading: string
  children: React.ReactNode
}) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brandText}>{siteName}</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>{heading}</Heading>
          {children}
        </Section>
      </Container>
    </Body>
  </Html>
)

export const CtaButton = ({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) => (
  <Button style={button} href={href}>
    {children}
  </Button>
)

export const OtpCode = ({ token, label = 'Or enter this code' }: { token?: string; label?: string }) => {
  if (!token) return null
  return (
    <Section style={codeWrap}>
      <Text style={codeLabel}>{label}</Text>
      <Text style={codeValue}>{token}</Text>
    </Section>
  )
}

export const FooterNote = ({ children }: { children: React.ReactNode }) => (
  <Text style={footer}>{children}</Text>
)
