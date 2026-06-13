# Equipment Alpha Engine

## Overview

A Node.js-based automation engine for identifying and capitalizing on liquidation opportunities in heavy equipment and machinery. It scrapes auction sites, calculates potential arbitrage spreads (FMV vs. current bid), automates buyer outreach, tracks sales funnel progress, and handles payments.

**Goal**: Find undervalued heavy machinery in Canada, connect with US buyers who can benefit from tax advantages and lower acquisition costs.

## Key Features
- Scraping of liquidation/auction listings (heavy equipment + aircraft)
- FMV estimation and spread/alpha calculation
- Automated multi-phase email outreach sequences
- Real-time dashboard for monitoring deals and time-to-expiration
- IMAP-based reply tracking and funnel management
- PDF generation for terms
- Stripe webhook integration for automated delivery

## Tech Stack
- Node.js / Express
- Puppeteer (with stealth plugin)
- Nodemailer + IMAP
- PostgreSQL
- PDFKit
- Node-cron

## Setup

1. `git clone https://github.com/Functionalfreedom/equipment-alpha-engine.git`
2. `npm install`
3. Create `.env` file (see `.env.example` if available) with required credentials
4. Run `node orchestrator.js` for scheduled jobs or individual scripts

## Important Notes
- Respect website terms of service and robots.txt
- Scraping can break when sites change
- This is an archived personal project for educational/reference purposes
- Requires proper legal/compliance review for production use

## License
MIT