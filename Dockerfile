FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY dev-requirements.txt .
RUN pip install --no-cache-dir -r dev-requirements
COPY . .
ENV PORT=8080
CMD ["gunicorn", "-b", ":$PORT", "main:app"]