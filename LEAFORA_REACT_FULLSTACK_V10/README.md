# LEAFORA V9

LEAFORA is a React + Node.js website for nursery plants, fresh fruits and vegetables.

## Run the website

The easiest method is to double-click `START_LEAFORA.bat`.

It starts:
- Backend: http://localhost:5000
- Frontend: http://localhost:5173

Then open Chrome at http://localhost:5173/

## Manual run

Backend terminal:
```powershell
cd backend
npm install
npm run dev
```

Frontend terminal:
```powershell
cd frontend
npm install
npm run dev
```

## V9 changes
- Trees, fruits and vegetables are separated into three sections.
- Removed the old All filter.
- Removed the fixed bottom cart panel.
- Cart stays in the page under Cart & Delivery and keeps previously added items.
- Added customer delivery details.
- Added Cash on Delivery, PhonePe and Google Pay demo payment choices.
- Added order placement and order history for the local demo.
- Added customer support links: phone, email and WhatsApp.
- Added more trees, fruits and vegetables without removing the earlier catalog.
- Produce prices are based on current market-reference pages and are intended as realistic demo retail prices; actual local prices vary by market/day.
- Improved greenery background and nature-themed hero design.
- Product image failures no longer swap to unrelated images.
- Dynamic demo OTP and the existing backend account system are retained.

## Current market references used for produce pricing
- Andhra Pradesh vegetable reference: https://www.vegetablemarketprice.com/market/andhrapradesh/today
- Southern India fruit reference used for the demo: https://vegetablemarketprice.com/fruits/karnataka/today


## V10 header/cart update
- The cart is permanently accessible from the top header next to Logout.
- The old fixed/bottom cart bar is removed.
- Tree product images use exact named Wikimedia Commons files to avoid unrelated/mismatched images.
- Produce image failures show no unrelated fallback image.
- Local browser URL while running: http://localhost:5173/
