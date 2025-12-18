import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import time

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

SENDER_EMAIL = "janmeshraut.mitadt@gmail.com"
APP_PASSWORD = "ejnf urgs ipmc kgdg"
RECEIVER_EMAIL = "harshsaveop18@gmail.com"

# Creative HTML Email Templates
def get_creative_email(email_num):
    templates = [
        {
            "subject": "🎉 Welcome to Shree Sadguru Krupa Enterprises!",
            "body": """
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { padding: 30px; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #666; font-size: 12px; }
                    .button { background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
                    h1 { margin: 0; font-size: 28px; }
                    p { color: #333; line-height: 1.6; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome!</h1>
                        <p style="margin: 10px 0 0 0;">Shree Sadguru Krupa Enterprises</p>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>We are thrilled to welcome you to our invoice management system! 🚀</p>
                        <p>Experience seamless invoicing with our modern, professional platform designed for your business needs.</p>
                        <a href="https://invoice2-eosin.vercel.app" class="button">Get Started</a>
                        <p style="margin-top: 20px; color: #666;">Best regards,<br>Shree Sadguru Krupa Enterprises Team</p>
                    </div>
                    <div class="footer">
                        <p>© 2025 Shree Sadguru Krupa Enterprises. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
        },
        {
            "subject": "📊 Your Invoice Report is Ready",
            "body": """
            <html>
            <head>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; }
                    .content { padding: 30px; }
                    .stats { display: flex; justify-content: space-around; margin: 20px 0; padding: 20px; background: #f9fafb; border-radius: 8px; }
                    .stat { text-align: center; }
                    .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
                    .stat-label { color: #666; font-size: 12px; margin-top: 5px; }
                    .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
                    .footer { background: #1f2937; color: white; padding: 20px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0;">📊 Invoice Report</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your monthly summary is ready</p>
                    </div>
                    <div class="content">
                        <p>Hi there,</p>
                        <p>Your latest invoice report has been generated. Here's what we tracked:</p>
                        <div class="stats">
                            <div class="stat">
                                <div class="stat-value">12</div>
                                <div class="stat-label">Invoices</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">₹45K</div>
                                <div class="stat-label">Total Amount</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value">18</div>
                                <div class="stat-label">Clients</div>
                            </div>
                        </div>
                        <p>Everything looks great! Your business is growing. 📈</p>
                        <center><a href="https://invoice2-eosin.vercel.app" class="button">View Details</a></center>
                    </div>
                    <div class="footer">
                        <p style="margin: 0;">© 2025 Shree Sadguru Krupa Enterprises</p>
                    </div>
                </div>
            </body>
            </html>
            """
        },
        {
            "subject": "✨ Special Offer - Premium Features",
            "body": """
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
                    .header { background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%); color: white; padding: 40px 30px; text-align: center; }
                    .content { padding: 40px 30px; text-align: center; }
                    .offer { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
                    .feature-list { text-align: left; display: inline-block; margin: 20px 0; }
                    .feature { padding: 10px 0; }
                    .feature:before { content: "✓ "; color: #10b981; font-weight: bold; }
                    .button { background: #f5576c; color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; display: inline-block; margin-top: 20px; font-weight: bold; }
                    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0; font-size: 32px;">✨ Exclusive Offer!</h1>
                    </div>
                    <div class="content">
                        <p>Limited Time Offer - Unlock Premium Features Today! 🎁</p>
                        <div class="offer">
                            <strong>50% OFF on Annual Plan</strong><br>
                            Use code: GROW2025
                        </div>
                        <div class="feature-list">
                            <div class="feature">Unlimited Invoices</div>
                            <div class="feature">Advanced Analytics</div>
                            <div class="feature">Priority Support</div>
                            <div class="feature">Custom Branding</div>
                            <div class="feature">API Access</div>
                        </div>
                        <a href="https://invoice2-eosin.vercel.app" class="button">Claim Offer Now</a>
                        <p style="margin-top: 20px; color: #666; font-size: 12px;">Offer valid until December 31, 2025</p>
                    </div>
                    <div class="footer">
                        <p>Questions? We're here to help!</p>
                    </div>
                </div>
            </body>
            </html>
            """
        },
        {
            "subject": "🔔 Invoice #INV-2025-001 - Payment Reminder",
            "body": """
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #ecf0f1; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
                    .header { background: #34495e; color: white; padding: 30px; }
                    .invoice-box { background: #f8f9fa; padding: 20px; margin: 20px 30px; border-left: 4px solid #3498db; }
                    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
                    .row:last-child { border-bottom: 2px solid #34495e; font-weight: bold; }
                    .content { padding: 30px; }
                    .button { background: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
                    .footer { background: #34495e; color: white; padding: 20px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0;">Invoice Payment Reminder</h1>
                    </div>
                    <div class="invoice-box">
                        <div class="row">
                            <span>Invoice Number:</span>
                            <strong>INV-2025-001</strong>
                        </div>
                        <div class="row">
                            <span>Amount Due:</span>
                            <strong style="color: #e74c3c;">₹45,000</strong>
                        </div>
                        <div class="row">
                            <span>Due Date:</span>
                            <strong>January 10, 2025</strong>
                        </div>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>This is a friendly reminder that your invoice is due soon.</p>
                        <center><a href="https://invoice2-eosin.vercel.app" class="button">View & Pay Invoice</a></center>
                    </div>
                    <div class="footer">
                        <p style="margin: 0;">Thank you for your business!</p>
                    </div>
                </div>
            </body>
            </html>
            """
        },
        {
            "subject": "🎯 Success! Invoice Generated Successfully",
            "body": """
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #e8f5e9; margin: 0; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
                    .header { background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 40px 30px; text-align: center; }
                    .checkmark { font-size: 60px; margin: 0; }
                    .content { padding: 30px; text-align: center; }
                    .success-message { background: #c8e6c9; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .details { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: left; }
                    .footer { background: #f1f1f1; padding: 20px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 class="checkmark">✓</h1>
                        <h1 style="margin: 0;">Invoice Generated!</h1>
                    </div>
                    <div class="content">
                        <div class="success-message">
                            <strong>Your invoice has been created successfully!</strong>
                        </div>
                        <div class="details">
                            <p><strong>Invoice Details:</strong></p>
                            <p>Invoice #: INV-2025-0001<br>
                            Amount: ₹45,000<br>
                            Date: """ + time.strftime("%B %d, %Y") + """<br>
                            Status: ✓ Completed</p>
                        </div>
                        <p>Your invoice is ready to download and share with your clients.</p>
                    </div>
                    <div class="footer">
                        <p>Questions? Contact us anytime. We're here to help! 😊</p>
                    </div>
                </div>
            </body>
            </html>
            """
        }
    ]
    
    return templates[(email_num - 1) % len(templates)]

server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
server.starttls()
server.login(SENDER_EMAIL, APP_PASSWORD)

for i in range(1, 11):
    email_data = get_creative_email(i)
    
    msg = MIMEMultipart("alternative")
    msg["From"] = SENDER_EMAIL
    msg["To"] = RECEIVER_EMAIL
    msg["Subject"] = email_data["subject"]

    msg.attach(MIMEText(email_data["body"], "html"))

    try:
        server.sendmail(SENDER_EMAIL, RECEIVER_EMAIL, msg.as_string())
        print(f"✅ Sent email {i}: {email_data['subject']}")
    except Exception as e:
        print(f"❌ Error sending email {i}: {str(e)}")

    time.sleep(2)  # delay to avoid spam flags

server.quit()
print("\n🎉 All creative emails sent successfully!")
