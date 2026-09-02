FROM python:3.11-slim

WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY . .
ENV PYTHONPATH=/app:/app/backend
ENV DATABASE_URL=postgresql+psycopg2://veritas:veritas@postgres:5432/veritas
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
