import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
        user: "invoice@addphonebook.com",
        pass: "Lakshmiraj2024@",
    },
});

const sendEmail = async (
  userData,
  paymentId,
  price,
  invoiceId
) => {
  const {
    email,
    fullName,
    phoneNumber,
    countryCode,
    createdAt,
    companyName,
    gstNo,
  } = userData;

  if (!createdAt || !createdAt._seconds || !createdAt._nanoseconds) {
    throw new Error("Invalid creation time");
  }

  const formattedCreatedAt = new Date(createdAt._seconds * 1000 + createdAt._nanoseconds / 1000000).toLocaleString('en-IN', {
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

  const htmlContent = `
      <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice</title>
    <style>
        body { font-family: 'Arial', sans-serif; background-color: #f5f7fa; color: #333; line-height: 1.6; }
        .container {
            width: 95%;
            max-width: 700px;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
            padding: 30px;
            margin: 20px auto;
        }
        .header {
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }
        .header img {
            max-width: 180px;
            height: auto;
            vertical-align: middle;
        }
        .headerTitle {
            font-size: 28px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        .invoiceId {
            font-size: 14px;
            color: #777;
            text-align: right;
            margin-bottom: 0;
        }
        .content p { margin-bottom: 10px; color: #555; }
        .content h2 {
            font-size: 20px;
            color: #2c3e50;
            margin-bottom: 15px;
            border-bottom: 2px solid #eee;
            padding-bottom: 5px;
        }
        .invoiceDetails {
            margin-top: 15px;
            margin-bottom: 15px;
            line-height: 1.5;
            font-size: 14px;
            color: #555;
        }
        .invoiceTable {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 14px;
            border: 1px solid #eee;
        }
        .invoiceTable th, .invoiceTable td {
            padding: 12px 10px;
            border: 1px solid #eee;
            text-align: left;
        }
        .invoiceTable th {
            background-color: #f9f9f9;
            font-weight: bold;
            color: #2c3e50;
            text-align: left;
        }
        .invoiceTable tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .grandTotalRow td {
            font-size: 16px;
            font-weight: bold;
            color: #2c3e50;
            background-color: #eaf2ff;
            padding-top: 15px;
            padding-bottom: 15px;
        }
        .footer {
            text-align: center;
            width: 100%;
            margin-top: 30px;
            font-size: 12px;
            color: #777;
            line-height: 1.6;
            padding-top: 15px;
            border-top: 1px solid #eee;
        }
        .footer a { color: #007bff; text-decoration: none; font-weight: bold; }
        @media (max-width: 600px) {
            .container { width: 100%; padding: 20px; }
            .headerTitle { font-size: 22px; }
            .header img { max-width: 150px; }
            .content h2 { font-size: 18px; }
            .invoiceDetails { font-size: 13px; }
            .invoiceTable { font-size: 12px; }
            .invoiceTable th, .invoiceTable td {
                padding: 10px 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <table width="100%">
                <tr>
                    <td><img src="https://firebasestorage.googleapis.com/v0/b/addphonebook-67776.firebasestorage.app/o/images%2FAPB-Logo.png?alt=media&token=9c376f86-a1a1-47f9-ae84-14a044f13290" alt="AddPhoneBook Logo"></td>
                    <td style="text-align: right;">
                        <p class="headerTitle">Invoice</p>
                        <p class="invoiceId"><strong>Invoice ID:</strong> INV-20250118-0008</p>
                    </td>
                </tr>
            </table>
        </div>
        <div class="content">
            <p>Dear Kalyan,</p>
            <p>Thank you for choosing Add Phone Book. Below is the summary of your recent subscription details.</p>
            <div class="invoiceDetails">
                <p style="margin-bottom: 4px;"><strong>Date:</strong> 4 January 2025 at 3:37 pm</p>
                <p style="margin-bottom: 4px;"><strong>User Email:</strong> kalyankodisha@gmail.com</p>
                <p style="margin-bottom: 4px;"><strong>Payment ID:</strong> 24234627</p>
                <p style="margin-bottom: 4px;"><strong>Contact Number:</strong> +91 8333946577</p>
            </div>
            <h2>Billing Summary</h2>
            <table class="invoiceTable">
                <tr><th>Description</th><th>Amount (INR)</th></tr>
                <tr><td>Subscription Plan: Annual</td><td>1234.00</td></tr>
                <tr><td>GST (18%)</td><td>222.12</td></tr>
                <tr><td>Online Transaction + Service Charges</td><td>37.02</td></tr>
                <tr class="grandTotalRow"><td>Grand Total</td><td>1493.14</td></tr>
            </table>
        </div>
        <div class="footer">
            <p>For any questions, please contact our support at <a href="mailto:support@addphonebook.com">support@addphonebook.com</a></p>
            <p>Product of Add Phone Book © 2024. All rights reserved.</p>
        </div>
    </div>
</body>
</html>

  `;

  const mailOptions = {
    from: "invoice@addphonebook.com",
    to: email,
    subject: "Your Invoice from Add Phone Book",
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: `Email sent to ${email}` };
  } catch (error) {
    throw new Error(error.message);
  }
};

export default { sendEmail };
