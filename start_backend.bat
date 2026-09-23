@echo off
echo ========================================================
echo Starting Smart Fleet Backend (FastAPI + SQLite)
echo ========================================================
cd backend

if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing / verifying dependencies with python -m pip...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo.
echo ========================================================
echo Starting FastAPI Server at http://localhost:8000
echo Swagger UI Documentation: http://localhost:8000/docs
echo ========================================================
python run.py
pause
