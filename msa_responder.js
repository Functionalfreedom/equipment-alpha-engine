const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS.replace(/\s+/g, '') }
});

async function sendMSAPackage(buyerEmail, assetId) {
    const mailOptions = {
        from: `"Hierarchy Legal" <${process.env.EMAIL_USER}>`,
        to: buyerEmail,
        subject: `ACTION REQUIRED: MSA & Technical Specs for ID ${assetId}`,
        html: `
            <div style="font-family: Arial; padding: 20px; border: 1px solid #ddd;">
                <h3>Agreement Phase: Hierarchy Investment Capital</h3>
                <p>Thank you for your interest in Asset <b>${assetId}</b>.</p>
                <p>Attached to this email, please find the <b>Master Service Agreement (MSA)</b>. To move to the final procurement and payment phase, please reply with "CONFIRMED".</p>
                <p><i>Note: Upon confirmation, a Stripe secure payment link for the assignment fee will be issued.</i></p>
            </div>`
    };

    await transporter.sendMail(mailOptions);
    console.log(`[HIC] MSA Package sent to ${buyerEmail}`);
}

// For testing purposes, we run it manually
sendMSAPackage('belgie.nunez@gmail.com', 'HIC-5098E80121');
