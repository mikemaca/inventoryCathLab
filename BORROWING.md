# Borrowing

Open borrow.html from the inventory page. Take or choose a label photo, review the extracted fields, and add each item. Review the list and provide a contact name plus email or phone. Requests are held in memory only; reloading clears them.

The page uses Tesseract.js 5.1.1 in the browser. Its scripts and language data require internet access. Photos are processed locally and are not attached to email. OCR is approximate: explicitly labeled description, GTIN, REF, LOT and expiry fields and parenthesized GS1 01/10/17 fields are supported. Symbols, unlabeled descriptions and other layouts may require manual entry. Dates are preserved as printed, including six-digit GS1 dates. Every item requires manual verification.

Prepare email opens the device mail app addressed to mike_ma_ca@hotmail.com. The borrower must press Send. This static repository has no email backend and cannot confirm delivery. Long requests can be downloaded or copied into email. Automatic delivery requires a separately configured server-side email service; never put email service credentials in the page.

Checks: `node --check borrow.js` and `node borrow.test.cjs`.
Before release, test camera capture on iOS and Android, actual label OCR, editing/removing multiple items, contact validation, and delivery with the intended email app.
