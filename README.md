# Rentora — Backend API

## Project Purpose
The Rentora backend provides the API and server-side functionality for the Rentora equipment rental platform. It handles authentication, user profiles, equipment, bookings, payments, and role-based authorization.

## Live Website
https://rentora-client-xi.vercel.app

## Live Backend API
https://rentora-server-koem.vercel.app

## Key Features
- RESTful API built with Express.
- User authentication and session management using Better Auth.
- MongoDB database integration.
- Role-based authorization for Customers, Owners, and Admins.
- Protected API routes.
- Equipment listing and management.
- Booking creation, retrieval, and cancellation.
- Stripe test-mode payment integration.
- User profile retrieval and updates.
- Profile photo upload using ImgBB.
- Input validation and error handling.

## Technologies Used
- Node.js
- Express
- TypeScript
- MongoDB
- Better Auth

## NPM Packages Used
- express
- better-auth
- @better-auth/mongo-adapter
- mongodb
- multer
- stripe
- dotenv
- cors
- typescript
- tsx

## Run Locally

Install dependencies:

    npm install

Start the development server:

    npm run dev

The backend runs at http://localhost:5001.

## Build

    npm run build

## GitHub Repository
https://github.com/affanbhuiyan/Rentora_Server
