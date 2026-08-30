# InvestmentTracker

A barebones monorepo setup for an Investment Tracker application with a **React + Vite** frontend and a **Python Django REST Framework** backend with **Plaid** integration.

---

## 📁 Repository Structure

```text
InvestmentTracker/
├── backend/                  # Python Django backend
│   ├── api/                  # API app (general endpoints & health check)
│   │   ├── apps.py
│   │   ├── urls.py           # /api/hello/, /api/health/
│   │   └── views.py
│   ├── plaid_link/           # Modern Plaid integration app
│   │   ├── migrations/       # Database migrations
│   │   ├── apps.py
│   │   ├── models.py         # PlaidItem model for storing access tokens
│   │   ├── plaid_client.py   # Modern plaid-python v43 client helper
│   │   ├── tests.py          # Plaid API test suite
│   │   ├── urls.py           # Plaid API routes
│   │   └── views.py          # Link token, exchange, holdings & transactions views
│   ├── config/               # Django project settings & root URLs
│   │   ├── settings.py       # CORS, DRF, & Plaid configured
│   │   └── urls.py
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx           # Hello World UI with live Django API health check
│   │   ├── index.css         # Tailwind CSS styling
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts        # Vite proxy configured for /api -> http://localhost:8000
├── package.json              # Root helper scripts
├── .env.example              # Environment variables template
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### 1. Backend Setup (Django)

From the project root:

```bash
# 1. Install Python dependencies
pip install -r backend/requirements.txt

# 2. Configure environment variables (copy .env.example to .env and add your Plaid keys)
cp .env.example .env

# 3. Run database migrations
python backend/manage.py migrate

# 4. (Optional) Run tests
python backend/manage.py test plaid_link

# 5. Start Django development server (runs on http://127.0.0.1:8000)
python backend/manage.py runserver 8000
```

#### API Endpoints
- `GET  /api/hello/` — Health greeting and server timestamp
- `GET  /api/health/` — Basic health check
- `POST /api/plaid/create_link_token/` — Generates a `link_token` for Plaid Link frontend modal
- `POST /api/plaid/exchange_public_token/` — Exchanges public token for access token and saves item
- `GET  /api/plaid/holdings/` — Retrieves investment holdings, securities, and balances
- `GET  /api/plaid/investment_transactions/` — Retrieves investment transactions
- `GET  /api/plaid/items/` — Lists linked accounts
- `DELETE /api/plaid/items/?item_id=<id>` — Disconnects and removes a linked account

---

### 2. Frontend Setup (React + Vite + Tailwind)

In a separate terminal window:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on [http://localhost:5173](http://localhost:5173).

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React icons
- **Backend**: Python 3, Django 5.2, Django REST Framework, django-cors-headers, plaid-python v43+, SQLite3
- **Communication**: Reverse-proxy configured in `vite.config.ts` and CORS headers enabled in Django.