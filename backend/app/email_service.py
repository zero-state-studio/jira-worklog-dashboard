"""
Email Service - Send emails via SMTP or SendGrid.
"""
import aiosmtplib
from email.message import EmailMessage
from typing import Optional

from .auth_config import auth_settings


class EmailService:
    """Email service supporting SMTP and SendGrid providers."""

    @staticmethod
    async def send_invitation_email(
        to_email: str,
        invitation_token: str,
        company_name: str,
        invited_by_email: str,
        frontend_url: str = "http://localhost:5173"
    ):
        """
        Send invitation email to a new user.

        Args:
            to_email: Recipient email address
            invitation_token: Unique invitation token
            company_name: Name of the company they're being invited to
            invited_by_email: Email of the person who sent the invitation
            frontend_url: Base URL of the frontend application
        """
        invitation_link = f"{frontend_url}/invitation/{invitation_token}"

        subject = f"You've been invited to join {company_name} on JIRA Worklog Dashboard"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>JIRA Worklog Dashboard</h1>
                </div>
                <div class="content">
                    <p>Hi there!</p>
                    <p><strong>{invited_by_email}</strong> has invited you to join <strong>{company_name}</strong> on the JIRA Worklog Dashboard.</p>
                    <p>Click the button below to accept your invitation and create your account:</p>
                    <center>
                        <a href="{invitation_link}" class="button">Accept Invitation</a>
                    </center>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="background: #fff; padding: 10px; border-radius: 4px; word-break: break-all;">
                        {invitation_link}
                    </p>
                    <p style="margin-top: 30px; color: #666; font-size: 14px;">
                        This invitation will expire in 72 hours.
                    </p>
                </div>
                <div class="footer">
                    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        JIRA Worklog Dashboard - Invitation

        Hi there!

        {invited_by_email} has invited you to join {company_name} on the JIRA Worklog Dashboard.

        Accept your invitation by visiting:
        {invitation_link}

        This invitation will expire in 72 hours.

        If you didn't expect this invitation, you can safely ignore this email.
        """

        if auth_settings.EMAIL_PROVIDER == "smtp":
            await EmailService._send_via_smtp(to_email, subject, html_body, text_body)
        elif auth_settings.EMAIL_PROVIDER == "sendgrid":
            await EmailService._send_via_sendgrid(to_email, subject, html_body, text_body)
        else:
            raise ValueError(f"Unknown email provider: {auth_settings.EMAIL_PROVIDER}")

    @staticmethod
    async def _send_via_smtp(
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str
    ):
        """Send email via SMTP."""
        message = EmailMessage()
        message["From"] = auth_settings.FROM_EMAIL
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(text_body)
        message.add_alternative(html_body, subtype="html")

        try:
            if auth_settings.SMTP_USER and auth_settings.SMTP_PASSWORD:
                # Authenticated SMTP
                await aiosmtplib.send(
                    message,
                    hostname=auth_settings.SMTP_HOST,
                    port=auth_settings.SMTP_PORT,
                    username=auth_settings.SMTP_USER,
                    password=auth_settings.SMTP_PASSWORD,
                    use_tls=auth_settings.SMTP_PORT == 465,
                    start_tls=auth_settings.SMTP_PORT == 587
                )
            else:
                # Unauthenticated SMTP (for local development)
                await aiosmtplib.send(
                    message,
                    hostname=auth_settings.SMTP_HOST,
                    port=auth_settings.SMTP_PORT
                )
        except Exception as e:
            print(f"Failed to send email via SMTP: {e}")
            raise

    @staticmethod
    async def _send_via_sendgrid(
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str
    ):
        """Send email via SendGrid API."""
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
        except ImportError:
            raise ImportError("sendgrid package is required for SendGrid email provider")

        message = Mail(
            from_email=auth_settings.FROM_EMAIL,
            to_emails=to_email,
            subject=subject,
            plain_text_content=text_body,
            html_content=html_body
        )

        try:
            sg = SendGridAPIClient(auth_settings.SENDGRID_API_KEY)
            response = sg.send(message)
            if response.status_code not in [200, 201, 202]:
                raise Exception(f"SendGrid returned status {response.status_code}")
        except Exception as e:
            print(f"Failed to send email via SendGrid: {e}")
            raise


# Convenience function
async def send_invitation_email(
    to_email: str,
    invitation_token: str,
    company_name: str,
    invited_by_email: str
):
    """Send invitation email (convenience wrapper)."""
    await EmailService.send_invitation_email(
        to_email=to_email,
        invitation_token=invitation_token,
        company_name=company_name,
        invited_by_email=invited_by_email
    )
