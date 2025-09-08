#!/usr/bin/env sh

npm install
cd source
npx prisma generate
npm run dev 
