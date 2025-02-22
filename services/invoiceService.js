// invoiceService.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
        user: "invoice@addphonebook.com",
        pass: "Lakshmiraj2024@",
    },
    pool: true,
    maxConnections: 1,
    rateDelta: 20000,
    rateLimit: 5,
    dkim: {
        domainName: "addphonebook.com",
        keySelector: "default",
        privateKey: "YOUR_DKIM_PRIVATE_KEY"
    }
});

const sendEmail = async (
  user,
  paymentId,
  amount,
  invoiceId,
  splitDetails = null
) => {
  const {
    email,
    fullName,
    displayName,
    phoneNumber,
    countryCode,
    createdAt,
    companyName,
    gstNo,
    bankDetails,
  } = user;

  // Basic validation
  if (!email || !paymentId || !amount || !invoiceId) {
    throw new Error("Missing required fields for invoice");
  }

  // Ensure createdAt has the correct format
  if (!createdAt || typeof createdAt._seconds !== 'number') {
    console.warn("Invalid createdAt format, using current time");
    user.createdAt = {
        _seconds: Math.floor(Date.now() / 1000),
        _nanoseconds: (Date.now() % 1000) * 1000000
    };
  }

  const recipientName = fullName || displayName || (bankDetails && bankDetails.beneficiaryName) || "Valued Customer";

  const formattedCreatedAt = new Date(user.createdAt._seconds * 1000 + (user.createdAt._nanoseconds || 0) / 1000000)
    .toLocaleString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
      hour12: true
    });

  const gstField = gstNo ? `<p style="margin-bottom: 4px;"><strong>GST Number:</strong> ${gstNo}</p>` : "";
  const companyField = companyName ? `<p style="margin-bottom: 4px;"><strong>Company Name:</strong> ${companyName}</p>` : "";

  let splitDetailsField = "";
  if (splitDetails) {
    splitDetailsField = `
      <p style="margin-bottom: 4px; font-size: 14px; color: #555"><strong>Commission Amount:</strong> ${splitDetails.commissionAmount}</p>
    `;
  }

  const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice</title>
      </head>
      <body style="font-family: 'Arial', sans-serif; background-color: #f5f7fa; color: #333; line-height: 1.6; margin: 0; padding: 0;">
          <div class="container" style="width: 100%;
                  max-width: 700px;
                  background-color: #ffffff;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
                  margin: 20px auto;
                  padding: 30px;">
               <div class="header" style="margin-bottom: 25px;
                  padding-bottom: 15px;
                  border-bottom: 1px solid #eee;
                    display: table;
                    width: 100%;">
                <div class="header-row" style=" display: table-row;
                  width: 100%;">
                   <div style="display: table-cell; vertical-align: middle; width: 50%; white-space: nowrap;">
                                         <img src="https://firebasestorage.googleapis.com/v0/b/addphonebook-67776.firebasestorage.app/o/images%2FAPB-Logo.png?alt=media&token=02b9faf2-435c-4f3e-82cb-887e0cdfc699" alt="AddPhoneBook Logo" style=" display: inline-block;
                  max-width: 50px;
                  height: auto;
                  vertical-align: middle;">
                    <span class="headerTitle" style="font-size: 28px;
                  font-weight: bold;
                  color: #2c3e50;
                   margin-bottom: 5px;
                  display: inline-block;
                  vertical-align: middle;
                  padding-left: 10px;">AddPhoneBook</span>
                    </div>
                  <div style="text-align: right;  display: table-cell; vertical-align: middle; width: 50%;">
                      <p class="headerTitle" style="display: block; text-align: right;  font-size: 28px;
                        font-weight: bold;
                       color: #2c3e50;
                       margin-bottom: 5px;
                       ">Invoice</p>
                      <p class="invoiceId" style="font-size: 14px;
                         color: #777;
                         text-align: right;
                         margin-bottom: 0;"><strong>Invoice ID:</strong> ${invoiceId}</p>
                  </div>
                 </div>
              </div>
              <div class="content">
                 <p style="margin-bottom: 10px; color: #555; font-size: 14px;">Dear ${recipientName},</p>
                 <p style="margin-bottom: 10px; color: #555; font-size: 14px;">Thank you for choosing Add Phone Book. Below is the summary of your recent subscription details.</p>
                  <div class="invoiceDetails" style="margin-top: 15px;
                      margin-bottom: 15px;
                      line-height: 1.5;
                      font-size: 14px;
                      color: #555;">
                      <p style="margin-bottom: 4px; font-size: 14px; color: #555"><strong>Date:</strong> ${formattedCreatedAt}</p>
                      <p style="margin-bottom: 4px; font-size: 14px; color: #555"><strong>User Email:</strong> ${email}</p>
                      ${companyField}
                      ${gstField}
                      <p style="margin-bottom: 4px; font-size: 14px; color: #555"><strong>Payment ID:</strong> ${paymentId}</p>
                      <p style="margin-bottom: 4px; font-size: 14px; color: #555"><strong>Contact Number:</strong> ${countryCode} ${phoneNumber}</p>
                      ${splitDetailsField}
                  </div>
                 <h2 style=" font-size: 20px;
                       color: #2c3e50;
                       margin-bottom: 15px;
                       border-bottom: 2px solid #eee;
                       padding-bottom: 5px;">Billing Summary</h2>
                  <table class="invoiceTable" style="width: 100%;
                       border-collapse: collapse;
                      margin-top: 15px;
                      font-size: 14px;
                     border: 1px solid #eee;">
                      <tr style=" background-color: #f9f9f9; font-weight: bold;
                            color: #2c3e50; text-align: left;">
                          <th style="padding: 12px 10px;
                             border: 1px solid #eee;
                             text-align: left;">Description</th>
                          <th style="padding: 12px 10px;
                             border: 1px solid #eee;
                            text-align: left;">Amount (INR)</th>
                        </tr>
                      <tr style="  background-color: #f9f9f9;">
                        <td style="padding: 12px 10px;
                          border: 1px solid #eee;
                          text-align: left;">Subscription Plan: Annual</td>
                          <td style="padding: 12px 10px;
                             border: 1px solid #eee;
                            text-align: left;">${amount.toFixed(2)}</td>
                        </tr>
                     <tr style=" background-color: #f9f9f9;">
                      <td style="padding: 12px 10px;
                           border: 1px solid #eee;
                          text-align: left;">GST (18%)</td>
                          <td style="padding: 12px 10px;
                          border: 1px solid #eee;
                         text-align: left;">${(amount * 0.18).toFixed(2)}</td>
                     </tr>
                    <tr  style=" background-color: #f9f9f9;">
                      <td style="padding: 12px 10px;
                           border: 1px solid #eee;
                          text-align: left;">Online Transaction + Service Charges</td>
                      <td style="padding: 12px 10px;
                           border: 1px solid #eee;
                          text-align: left;">${(amount * 0.03).toFixed(2)}</td>
                       </tr>
                      <tr class="grandTotalRow" style="font-size: 16px;
                          font-weight: bold;
                          color: #2c3e50;
                         background-color: #eaf2ff;
                          padding-top: 15px;
                          padding-bottom: 15px;">
                           <td style="padding: 12px 10px;
                             border: 1px solid #eee;
                            text-align: left;  font-size: 16px;
                               font-weight: bold;
                               color: #2c3e50;
                                 background-color: #eaf2ff;
                                 padding-top: 15px;
                                 padding-bottom: 15px;">Grand Total</td>
                        <td style="padding: 12px 10px;
                          border: 1px solid #eee;
                          text-align: left; font-size: 16px;
                          font-weight: bold;
                          color: #2c3e50;
                          background-color: #eaf2ff;
                          padding-top: 15px;
                          padding-bottom: 15px;">${(amount * 1.21).toFixed(2)}</td>
                      </tr>
                  </table>
              </div>
             <div class="footer" style="text-align: center;
                   width: 100%;
                  margin-top: 30px;
                  font-size: 12px;
                   color: #777;
                   line-height: 1.6;
                   padding-top: 15px;
                     border-top: 1px solid #eee;">
                  <p style="margin-bottom: 10px; color: #555; font-size: 12px;">For any questions, please contact our support at <a href="mailto:support@addphonebook.com" style=" color: #007bff; text-decoration: none; font-weight: bold;">support@addphonebook.com</a></p>
                  <p style="margin-bottom: 10px; color: #555; font-size: 12px;">Product of Add Phone Book © 2024. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
  `;

  const mailOptions = {
    from: {
        name: "AddPhoneBook Billing",
        address: "invoice@addphonebook.com"
    },
    to: {
        name: recipientName,
        address: email
    },
    subject: `Payment Receipt - Invoice #${invoiceId} - AddPhoneBook`,
    html: htmlContent,
    text: `Thank you for your payment of INR ${amount} to AddPhoneBook. Your invoice number is ${invoiceId}.`,
    headers: {
      'Precedence': 'bulk',
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
      'List-Unsubscribe': `<mailto:unsubscribe@addphonebook.com?subject=unsubscribe&email=${email}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'X-Report-Abuse': 'Please report abuse at https://addphonebook.com/report-abuse',
      'X-Mailer': 'AddPhoneBook Billing System 1.0'
    },
    dsn: {
      id: invoiceId,
      return: 'headers',
      notify: ['failure', 'delay'],
      recipient: 'invoice@addphonebook.com'
    }
  };

  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await transporter.verify();
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return { 
      success: true, 
      message: `Email sent to ${email}`, 
      messageId: info.messageId 
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export default { sendEmail };