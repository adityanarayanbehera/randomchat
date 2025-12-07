// backend/utils/mailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// ✅ Correct transporter creation
const transporter = nodemailer.createTransport({
  service: "Gmail",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

/**
 * Send OTP Email for Password Reset
 */
export const sendOtpMail = async (to, otp) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL,
      to,
      subject: "Reset Your Password - Random Chat",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Your OTP for password reset is:</p>
          <div style="background: #f0f0f0; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 14px;">This OTP will expire in 5 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });
    console.log("✅ OTP email sent to:", to);
  } catch (error) {
    console.error("❌ Email send error:", error);
    throw error;
  }
};

/**
 * Send Email Verification
 */
export const sendVerificationEmail = async (to, userId) => {
  try {
    const verifyLink = `${process.env.FRONTEND_URL}/verify-email?userId=${userId}`;

    await transporter.sendMail({
      from: process.env.EMAIL,
      to,
      subject: "Verify Your Email - Random Chat",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Welcome to Random Chat!</h2>
          <p>Please verify your email by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyLink}" style="background: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy this link:</p>
          <p style="color: #3B82F6; font-size: 12px; word-break: break-all;">${verifyLink}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't create this account, you can safely ignore this email.</p>
        </div>
      `,
    });
    console.log("✅ Verification email sent to:", to);
  } catch (error) {
    console.error("❌ Verification email error:", error);
  }
};

/**
 * Send subscription billing email
 * ✅ NEW: For subscription payments and free upgrades
 */
export const sendSubscriptionEmail = async ({
  email,
  username,
  amount,
  duration,
  transactionId,
  expiryDate,
  isFree = false,
}) => {
  try {
    const subject = isFree
      ? "🎉 Free Premium Subscription Activated!"
      : "✅ Subscription Payment Successful";

    const htmlContent = isFree
      ? generateFreeSubscriptionEmail(username, expiryDate)
      : generatePaidSubscriptionEmail({
          username,
          amount,
          duration,
          transactionId,
          expiryDate,
        });

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject,
      html: htmlContent,
    });

    console.log(`✅ Subscription email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Subscription email send error:", error);
    throw error;
  }
};

/**
 * Generate HTML for paid subscription email
 */
const generatePaidSubscriptionEmail = ({
  username,
  amount,
  duration,
  transactionId,
  expiryDate,
}) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🎉 Payment Successful!</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px;">Thank you for subscribing to Premium</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">Hi <strong>${username}</strong>,</p>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Your premium subscription has been successfully activated. You now have access to all premium features including gender filter!
              </p>

              <!-- Invoice Details -->
              <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="color: #666666; font-size: 14px; border-bottom: 1px solid #e0e0e0;">
                    <strong>Transaction ID:</strong>
                  </td>
                  <td style="color: #333333; font-size: 14px; text-align: right; border-bottom: 1px solid #e0e0e0;">
                    ${transactionId}
                  </td>
                </tr>
                <tr>
                  <td style="color: #666666; font-size: 14px; border-bottom: 1px solid #e0e0e0; padding-top: 15px;">
                    <strong>Plan:</strong>
                  </td>
                  <td style="color: #333333; font-size: 14px; text-align: right; border-bottom: 1px solid #e0e0e0; padding-top: 15px;">
                    Premium ${duration}
                  </td>
                </tr>
                <tr>
                  <td style="color: #666666; font-size: 14px; border-bottom: 1px solid #e0e0e0; padding-top: 15px;">
                    <strong>Amount Paid:</strong>
                  </td>
                  <td style="color: #333333; font-size: 14px; text-align: right; border-bottom: 1px solid #e0e0e0; padding-top: 15px;">
                    <strong style="color: #10b981; font-size: 18px;">₹${amount}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="color: #666666; font-size: 14px; padding-top: 15px;">
                    <strong>Valid Until:</strong>
                  </td>
                  <td style="color: #333333; font-size: 14px; text-align: right; padding-top: 15px;">
                    ${expiryDate}
                  </td>
                </tr>
              </table>

              <!-- Features -->
              <div style="margin: 30px 0;">
                <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px;">✨ Your Premium Features:</h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #666666; font-size: 14px; line-height: 1.8;">
                  <li>🎯 Gender Filter - Match with your preferred gender</li>
                  <li>⚡ Smart Fallback - Auto-match if preference unavailable</li>
                  <li>👑 Premium Badge - Show your premium status</li>
                  <li>🚀 Priority Support - Get faster assistance</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.FRONTEND_URL}/settings" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Enable Gender Filter →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; color: #999999; font-size: 12px; line-height: 1.5;">
                If you have any questions or need assistance, please contact our support team.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2025 Random Chat. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

/**
 * Generate HTML for free subscription email
 */
const generateFreeSubscriptionEmail = (username, expiryDate) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Free Premium Activated</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px;">🎁 Congratulations!</h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 18px;">You've Got FREE Premium Access!</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">Hi <strong>${username}</strong>,</p>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Great news! Our admin has activated <strong>FREE Premium Access</strong> for all users. You can now enjoy all premium features at no cost!
              </p>

              <!-- Subscription Details -->
              <table width="100%" cellpadding="15" cellspacing="0" style="background: linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%); border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="text-align: center;">
                    <div style="color: #047857; font-size: 48px; font-weight: bold; margin: 10px 0;">₹0</div>
                    <div style="color: #065f46; font-size: 16px; font-weight: bold;">100% FREE</div>
                    <div style="color: #047857; font-size: 14px; margin-top: 10px;">Valid Until: ${expiryDate}</div>
                  </td>
                </tr>
              </table>

              <!-- Features -->
              <div style="margin: 30px 0;">
                <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px;">✨ Your Premium Features:</h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #666666; font-size: 14px; line-height: 1.8;">
                  <li>🎯 Gender Filter - Match with your preferred gender</li>
                  <li>⚡ Smart Fallback - Auto-match if preference unavailable</li>
                  <li>👑 Premium Badge - Show your premium status</li>
                  <li>🚀 Priority Support - Get faster assistance</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.FRONTEND_URL}/settings" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Start Using Premium Features →
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong>⚡ Limited Time Offer:</strong> This free premium access is available as long as the admin keeps it active. Make the most of it!
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © 2025 Random Chat. All rights reserved.
              </p>
              <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};
