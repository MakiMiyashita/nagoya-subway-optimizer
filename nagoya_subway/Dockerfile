FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

COPY nagoya_subway/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY nagoya_subway/ ./nagoya_subway/

CMD ["sh", "-c", "uvicorn nagoya_subway.app:app --host 0.0.0.0 --port ${PORT}"]
