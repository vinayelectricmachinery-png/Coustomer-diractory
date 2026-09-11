# विनय इलेक्ट्रिक मशीनरी - Customer Directory

## Files
- `index.html` - app interface
- `style.css` - app design
- `app.js` - Supabase connection and app logic

## Setup
1. Open `app.js` on GitHub.
2. At the top, replace `PASTE_YOUR_SUPABASE_PROJECT_URL_HERE` with your Supabase Project URL.
3. Replace `PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE` with your Supabase Publishable key.
4. Never use the Supabase Secret/service_role key in this browser app.
5. Commit the changes.
6. Configure Supabase RLS policies for the `customers` table before expecting database read/write operations to work.

## Expected table
The app expects the `customers` table with these columns:
- `id` uuid
- `shop` text
- `customer_name` text
- `village` text
- `mobile` text
- `date` text
- `Description` text
- `amount` text
- `created_at` timestamptz

Shop data is separated using the `shop` column with values `Shop 1` and `Shop 2`.
