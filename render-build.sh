#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "=== 1. Building React Frontend ==="
cd frontend
npm install
npm run build
cd ..

echo "=== 2. Installing Backend Dependencies ==="
cd backend
pip install -r requirements.txt

echo "=== 3. Running Database Migrations ==="
python manage.py migrate

echo "=== 4. Seeding Initial Plaid Account (if provided in env) ==="
python manage.py seed_plaid_item || true

echo "=== 5. Collecting Static Files ==="
python manage.py collectstatic --no-input

echo "=== Build Complete! ==="
