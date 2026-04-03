#!/bin/bash
echo "--- HIC CORE SYSTEM AUDIT ---"
echo "Location: $(pwd)"
echo "Files Present:"
ls -F hic-dispatcher.js crm-listener.js msa_responder.js aircraft-trawler.js
echo "---------------------------"
echo "PM2 Status:"
pm2 list
echo "---------------------------"
echo "Database Check (Aircraft):"
psql -d postgres -c "SELECT count(*) FROM live_purview WHERE category = 'Aircraft';"
