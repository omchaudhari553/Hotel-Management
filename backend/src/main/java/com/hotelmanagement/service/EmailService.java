package com.hotelmanagement.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    /**
     * Sends a 6-digit OTP to the user's email address for password reset.
     * If SMTP is active and configured, sends an HTML email via JavaMailSender.
     * If SMTP is not yet configured, logs the OTP prominently to the console/logger
     * so that the developer or admin can immediately verify it.
     */
    public boolean sendOtpEmail(String toEmail, String otp, String recipientName) {
        String safeName = (recipientName != null && !recipientName.isBlank()) ? recipientName : "User";
        log.info("=================================================================");
        log.info(">>> PASSWORD RESET OTP GENERATED FOR [{}] ({}): [{}] <<<", toEmail, safeName, otp);
        log.info("=================================================================");

        if (mailSender == null || fromEmail == null || fromEmail.isBlank()) {
            log.warn("SMTP email sender not fully configured (missing SPRING_MAIL_USERNAME/PASSWORD). OTP logged above.");
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "Hotel Billing System");
            helper.setTo(toEmail);
            helper.setSubject("Your Password Reset OTP - Hotel Billing System");

            String html = """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #0F172A; }
                    .card { max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); }
                    .header { text-align: center; margin-bottom: 24px; }
                    .brand { font-size: 20px; font-weight: 800; color: #090040; letter-spacing: 0.5px; }
                    .subtitle { font-size: 13px; color: #64748B; margin-top: 4px; }
                    .otp-box { background: #FEF3C7; border: 2px dashed #F59E0B; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
                    .otp-code { font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #B45309; }
                    .expiry { font-size: 12px; color: #78716C; margin-top: 6px; }
                    .footer { text-align: center; font-size: 11px; color: #94A3B8; margin-top: 28px; border-top: 1px solid #F1F5F9; padding-top: 16px; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <div class="header">
                      <div class="brand">HOTEL POS BILLING SYSTEM</div>
                      <div class="subtitle">Hotel & Restaurant Management Suite</div>
                    </div>
                    <p style="font-size: 15px; line-height: 1.5;">Hello <b>%s</b>,</p>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                      We received a request to reset your Hotel POS account password. Use the following 6-digit One-Time Password (OTP) to complete your verification:
                    </p>
                    <div class="otp-box">
                      <div class="otp-code">%s</div>
                      <div class="expiry">Valid for 10 minutes only</div>
                    </div>
                    <p style="font-size: 13px; color: #64748B; line-height: 1.5;">
                      If you did not request a password reset, please disregard this email. Your password will remain unchanged.
                    </p>
                    <div class="footer">
                      &copy; 2026 Hotel POS Billing. All rights reserved.<br/>
                      This is an automated security message. Please do not reply directly.
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(safeName, otp);

            helper.setText(html, true);
            mailSender.send(message);
            log.info("Password reset OTP email sent successfully to {}", toEmail);
            return true;
        } catch (Exception ex) {
            log.error("Failed to send password reset email to {}: {}", toEmail, ex.getMessage());
            if (ex.getMessage() != null && ex.getMessage().contains("535")) {
                log.error(">> SMTP 535 BadCredentials: Gmail rejected the App Password. Please check Google 2-Step Verification and generate a 16-character App Password at https://myaccount.google.com/apppasswords");
            }
            return false;
        }
    }
}
