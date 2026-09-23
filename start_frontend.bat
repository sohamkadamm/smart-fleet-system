@echo off
echo ========================================================
echo Starting Smart Fleet Frontend (React + Vite + Tailwind)
echo ========================================================
cd frontend

if not exist node_modules (
    echo Installing npm dependencies...
    npm install
)

echo Starting Vite development server...
echo Frontend will open at http://localhost:5173
npm run dev
pause
