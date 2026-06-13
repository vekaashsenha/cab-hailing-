# Cab Hailing

A premium cab-hailing and chauffeur booking website built with Next.js App Router, TypeScript, and Tailwind CSS.

## Features

- Homepage search flow for pickup, drop, date, time, and ride type
- Google Maps JavaScript API integration
- Places Autocomplete for pickup and drop inputs
- Directions route preview on the rides page
- Clean fallback state when the Google Maps key is missing or invalid
- Fleet selection, passenger booking form, dummy payment, and confirmation flow
- Local storage handoff between pages

## Routes

- `/` - Search and service overview
- `/rides` - Trip summary, route map, and car cards
- `/booking` - Passenger details
- `/payment` - Dummy payment options
- `/confirmation` - Booking confirmation

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Google Maps Setup

Create a `.env.local` file:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

Enable these Google APIs for the key:

- Maps JavaScript API
- Places API
- Directions API

The app continues to work without a valid key and shows a fallback message instead of crashing.

## Build

```bash
npm run build
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in Vercel project settings if map features are required.
4. Deploy from the `main` branch.
