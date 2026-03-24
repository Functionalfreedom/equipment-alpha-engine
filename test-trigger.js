require('dotenv').config();
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS.replace(/\s+/g, '') }
});

async function runTest() {
    const today = new Date().toISOString().split('T')[0];
    const dailyFolder = path.join(os.homedir(), 'Desktop', 'Hierarchy_Exports', today);
    if (!fs.existsSync(dailyFolder)) fs.mkdirSync(dailyFolder, { recursive: true });

    const testPath = path.join(dailyFolder, 'TEST_CONTRACT.pdf');
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent("<h1>HIERARCHY SYSTEM TEST</h1><p>BCC + PDF Attachment Verification</p>");
    await page.pdf({ path: testPath, format: 'Letter' });
    await browser.close();

    const mailOptions = {
        from: `"Hierarchy Investment Capital" <${process.env.EMAIL_USER}>`,
        to: 'juliana_cr18@hotmail.com',
        bcc: process.env.EMAIL_USER,
        subject: "HIERARCHY SYSTEM TEST: PDF ATTACHMENT",
        html: "<b>BCC + PDF Logic Test</b><p>The attachment below confirms the pipeline is ready.</p>",
        attachments: [{ filename: 'System_Test_Contract.pdf', path: testPath }]
    };

    try {
        await transporter.sendMail(mailOptions);
        const audit = { time: new Date().toLocaleTimeString(), recipient: 'juliana_cr18@hotmail.com', asset: 'SYSTEM_TEST_WITH_PDF', status: 'BCC_CORP_INBOX' };
        fs.appendFileSync('sent_audit.json', JSON.stringify(audit) + '\n');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
runTest();
