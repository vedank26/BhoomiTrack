# BhoomiTrack

Integrated Land Acquisition Management & Monitoring System.
Smart India Hackathon 2026, Team HackOps!

## What it does
- Officer, citizen and ministry portals with role-based login (Supabase Auth)
- GIS map of parcels (PostGIS + Leaflet) with parcel selection and ownership lookup
- Affected-parcel analysis from an uploaded route 
- Case tracking across survey, revenue, treasury and R&R workspaces

## Prototype status
This is a working prototype with **sample data**.
- Parcel geometry comes from an A-Ward (Mumbai) GIS baseline; owners and other details are synthetic.
- Impact and readiness values are fixtures.
- Planned, not yet built: statutory deadline alerts, ML lapse-risk model, realtime updates, document storage.

## Tech stack
React, TanStack Start, TypeScript, Tailwind, Supabase (Auth, PostgreSQL, PostGIS), Leaflet, Turf.js

## Run locally
1. npm install
2. Copy .env.example to .env and add your Supabase URL and publishable key
3. npm run dev

## Docs
Database design: docs/DATABASE.md
