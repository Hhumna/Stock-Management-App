"""
run.py
------
Entry point for the Flask development server.

Usage
-----
  # Option 1 — via Flask CLI (respects FLASK_APP / FLASK_ENV in .env)
  flask run --host=0.0.0.0

  # Option 2 — direct execution
  python run.py

  # Option 3 — gunicorn (production)
  gunicorn "run:app" --bind 0.0.0.0:5000 --workers 4
"""

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
