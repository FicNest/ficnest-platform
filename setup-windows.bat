@echo off
echo === FicNest Windows Setup Script ===
echo.

echo Installing dependencies...
call npm install

echo.
echo Installing cross-env for Windows compatibility...
call npm install cross-env --save-dev

echo.
echo Installing dotenv for environment variables...
call npm install dotenv --save

echo.
echo Updating package.json scripts for Windows...
echo You need to manually update your package.json scripts to use cross-env:
echo.
echo "scripts": {
echo   "dev": "cross-env NODE_ENV=development tsx server/index.ts",
echo   "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
echo   "start": "cross-env NODE_ENV=production node dist/index.js",
echo   "check": "tsc",
echo   "db:push": "cross-env drizzle-kit push"
echo },
echo.

echo Creating .env file with your Supabase connection...
echo # Database configuration > .env
echo DATABASE_URL=postgresql://postgres:FicNest%%40123@db.qbsdttklqfrnbnlfyrak.supabase.co:6543/postgres?sslmode=require >> .env
echo. >> .env
echo # Session secret for authentication >> .env
echo SESSION_SECRET=random_secure_string_for_session_encryption >> .env

echo.
echo Fixing WebSocket import in server/db.ts...
echo This helps prevent TypeScript errors with the ws module

echo Set wsImportFixed=0
set wsImportFixed=0

echo Checking if server/db.ts exists
if exist server\db.ts (
  echo Found server/db.ts
  
  echo Creating backup of the file
  copy server\db.ts server\db.ts.bak
  
  echo Updating the WebSocket import
  echo import { Pool, neonConfig } from '@neondatabase/serverless'; > server\db.ts.new
  echo import { drizzle } from 'drizzle-orm/neon-serverless'; >> server\db.ts.new
  echo import * as schema from "@shared/schema"; >> server\db.ts.new
  echo import * as dotenv from 'dotenv'; >> server\db.ts.new
  echo // For ESM compatibility, using namespace import >> server\db.ts.new
  echo import * as ws from 'ws'; >> server\db.ts.new
  echo. >> server\db.ts.new
  echo // Load environment variables from .env file >> server\db.ts.new
  echo dotenv.config^(^); >> server\db.ts.new
  echo. >> server\db.ts.new
  echo // Use the default export from ws >> server\db.ts.new
  echo // @ts-ignore - Ignore TypeScript errors for WebSocket constructor >> server\db.ts.new
  echo neonConfig.webSocketConstructor = ws.default; >> server\db.ts.new
  
  for /f "skip=12 delims=" %%i in (server\db.ts) do echo %%i >> server\db.ts.new
  
  move /y server\db.ts.new server\db.ts
  echo WebSocket import in server/db.ts has been fixed!
  set wsImportFixed=1
) else (
  echo server/db.ts not found. You'll need to fix the WebSocket import manually.
)

echo.
echo Setup complete!
echo.
echo To run the application:
echo 1. Make sure you've manually updated package.json as shown above
if %wsImportFixed%==0 echo 2. Fix the WebSocket import in server/db.ts as described in WINDOWS-SETUP.md
echo 3. Type: npm run dev
echo.
echo See WINDOWS-SETUP.md for detailed instructions and troubleshooting.
echo.
echo Press any key to exit...
pause > nul