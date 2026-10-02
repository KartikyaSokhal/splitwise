# API Contract

POST /api/receipts/extract — multipart image upload. Returns structured bill data or a safe error.

POST /api/split/calculate — deterministic split calculation when server-side calculation is required.

Example extraction:
{"success":true,"bill":{"currency":"INR","items":[{"name":"Paneer Tikka","quantity":1,"unitPriceMinor":32000,"totalMinor":32000}],"subtotalMinor":32000,"taxMinor":1600,"discountMinor":0,"totalMinor":33600},"warnings":[]}

Validate all input. Never expose secrets. Keep endpoints small.
