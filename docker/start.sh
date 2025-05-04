#!/bin/sh

# Wait for database
echo "Waiting for database..."
while ! nc -z database 5432; do
  sleep 1
done
echo "Database is ready!"

# Run database migrations
echo "Running database migrations..."
flask db upgrade

# Start Gunicorn server
echo "Starting Gunicorn server..."
gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 120 --log-level debug "wsgi:app"
