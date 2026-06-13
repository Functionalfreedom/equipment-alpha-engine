# Equipment Alpha Engine

## Overview

Open-source Node.js automation engine for sourcing heavy equipment and machinery liquidation opportunities. It scrapes auction/liquidation listings, calculates potential spreads (FMV vs bid price), and automates outreach sequences to interested buyers.

## Features
- Web scraping for heavy machinery and aircraft listings
- Spread / alpha opportunity calculation
- Automated email outreach sequences
- Dashboard for monitoring deals
- IMAP reply tracking and funnel management
- PDF generation and Stripe payment integration

## Tech Stack
- Node.js
- Puppeteer + Stealth for scraping
- Express
- Nodemailer + IMAP
- PostgreSQL
- PDFKit
- Node-cron

## Setup

1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your credentials
4. Run `node orchestrator.js` or individual scripts

## Important
This is a personal project archive. Use responsibly and respect website terms of service.