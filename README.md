# विनय इलेक्ट्रिक मशीनरी — App V1

## GitHub setup

Upload these 3 files to the repository root:

- index.html
- style.css
- app.js

## Supabase

Open `app.js` and replace:

```js
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";
```

Use the Supabase **Project URL** and the browser-safe **anon/publishable key**.

DO NOT put the `service_role` / secret key in `app.js`.

## Expected customers table

This V1 uses the table `customers` and these columns from your existing table:

- id
- shop
- customer_name
- village
- mobile
- date
- Description
- amount
- created_at
- user_id

The app calculates monthly collection and monthly customer count from the customer records. No separate monthly table is required.

## Important

For real security, enable Supabase Auth + Row Level Security (RLS) on `customers`, with policies that restrict rows to `auth.uid() = user_id`.

The frontend is ready for that setup.
