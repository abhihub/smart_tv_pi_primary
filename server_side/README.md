# SmartTV Backend Server

The Flask-based backend server for SmartTV that provides API services, Twilio integration for video calling, and real-time communication support for multiplayer features.

## 🏗️ Overview

This Flask application serves as the backend API for the SmartTV application, providing:
- Twilio access token generation for video calling
- Health check endpoints for monitoring
- CORS-enabled API for cross-origin requests
- Modular architecture with services and API routes

## 🚀 Architecture

### Project Structure

```
server_side/
├── app.py                 # Flask application factory and main entry point
├── api/
│   └── twilio_routes.py   # Twilio API endpoints
├── services/
│   └── twilio_service.py  # Twilio business logic and service layer
├── .env                   # Environment variables (not in repo)
├── .env.example          # Environment template
└── requirements.txt      # Python dependencies
```

### Design Patterns

- **Blueprint Architecture**: Modular API organization
- **Service Layer**: Business logic separation from routes
- **Environment Configuration**: Secure credential management
- **CORS Support**: Cross-origin resource sharing for Electron app

## 📦 Installation

### Prerequisites

- Python 3.8+ and pip
- Twilio account with API credentials

### Setup

```bash
# Navigate to backend directory
cd server_side

# Install dependencies
pip install flask flask-cors python-dotenv twilio

# Or use requirements.txt
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Environment Configuration

Create `.env` file with:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_API_KEY=your_twilio_api_key
TWILIO_API_SECRET=your_twilio_api_secret

# Server Configuration
PORT=3001
FLASK_ENV=development
FLASK_DEBUG=True

# Optional: Custom Twilio Region
TWILIO_REGION=us1
```

## 🏃 Running the Server

### Development Mode

```bash
# Default port (3001)
python app.py

# Custom port
PORT=5000 python app.py

# With debug mode
FLASK_DEBUG=True python app.py
```

### Production Mode

```bash
# Set production environment
export FLASK_ENV=production
export FLASK_DEBUG=False

# Run with gunicorn (recommended)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:3001 app:app
```

## 🔌 API Endpoints

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "SmartTV Backend"
}
```

### Twilio Token Generation

```http
POST /api/token
Content-Type: application/json

{
  "identity": "user123",
  "room": "room456"
}
```

**Response:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "identity": "user123",
  "room": "room456"
}
```

**Error Response:**
```json
{
  "error": "Missing required field: identity"
}
```

## 🛠️ Development

### Project Components

#### `app.py` - Application Factory

- Flask application initialization
- CORS configuration for cross-origin requests
- Blueprint registration for API routes
- Environment-based configuration
- Server startup and port configuration

#### `api/twilio_routes.py` - API Routes

- RESTful endpoint definitions
- Request validation and error handling
- Response formatting and status codes
- Integration with service layer

#### `services/twilio_service.py` - Business Logic

- Twilio SDK integration and configuration
- Access token generation with room and identity
- Error handling for Twilio API calls
- Service-level abstraction for API routes

### Adding New Features

1. **New Service**: Create service file in `services/`
2. **New Routes**: Add blueprint in `api/`
3. **Register Blueprint**: Import and register in `app.py`
4. **Environment Variables**: Add to `.env.example`

### Code Structure Example

```python
# services/new_service.py
from twilio.rest import Client
import os

class NewService:
    def __init__(self):
        self.client = Client(
            os.getenv('TWILIO_API_KEY'),
            os.getenv('TWILIO_API_SECRET'),
            os.getenv('TWILIO_ACCOUNT_SID')
        )
    
    def new_functionality(self, param):
        # Business logic here
        pass

# api/new_routes.py
from flask import Blueprint, request, jsonify
from services.new_service import NewService

new_bp = Blueprint('new', __name__)
service = NewService()

@new_bp.route('/api/new-endpoint', methods=['POST'])
def new_endpoint():
    data = request.get_json()
    result = service.new_functionality(data.get('param'))
    return jsonify(result)
```

## 🔒 Security

### Environment Variables

- Never commit `.env` files to version control
- Use strong, unique API keys and secrets
- Rotate credentials regularly
- Use environment-specific configurations

### CORS Configuration

```python
# Configured for Electron app origin
CORS(app, origins=[
    "http://localhost:*",  # Development
    "file://*",            # Electron file:// protocol
    "https://yourdomain.com"  # Production domain
])
```

### Input Validation

- Validate all incoming request data
- Sanitize user inputs
- Use proper HTTP status codes
- Implement rate limiting for production

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:3001/api/health

# Token generation
curl -X POST http://localhost:3001/api/token \
  -H "Content-Type: application/json" \
  -d '{"identity": "test_user", "room": "test_room"}'
```

### Unit Testing

```python
# test_app.py
import unittest
from app import create_app

class TestAPI(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()
    
    def test_health_endpoint(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
```

## 📊 Monitoring and Logging

### Health Monitoring

- `/api/health` endpoint for uptime monitoring
- Add custom health checks for dependencies
- Monitor response times and error rates

### Logging Configuration

```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
```

### Error Handling

```python
@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({"error": "Internal server error"}), 500
```

## 🚀 Deployment

### Production Checklist

- [ ] Set `FLASK_ENV=production`
- [ ] Use production WSGI server (gunicorn)
- [ ] Configure proper logging
- [ ] Set up monitoring and health checks
- [ ] Secure environment variable management
- [ ] Configure reverse proxy (nginx)
- [ ] Set up SSL/TLS certificates

### Docker Deployment

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 3001

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:3001", "app:app"]
```

### Systemd Service

```ini
[Unit]
Description=SmartTV Backend Server
After=network.target

[Service]
Type=simple
User=smarttv
WorkingDirectory=/path/to/server_side
Environment=PATH=/path/to/venv/bin
ExecStart=/path/to/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

## 🐛 Troubleshooting

### Common Issues

1. **Import Errors**:
   - Verify all dependencies installed: `pip install -r requirements.txt`
   - Check Python version compatibility (3.8+)

2. **Twilio Authentication**:
   - Verify credentials in `.env` file
   - Check Twilio account status and limits
   - Ensure API key has necessary permissions

3. **CORS Errors**:
   - Check CORS configuration in `app.py`
   - Verify frontend URL matches CORS origins
   - Test with browser developer tools

4. **Port Conflicts**:
   - Check if port 3001 is already in use: `netstat -an | grep 3001`
   - Use different port: `PORT=5000 python app.py`

### Debug Mode

Enable detailed error messages:
```bash
export FLASK_DEBUG=True
python app.py
```

## 📈 Performance

### Optimization Tips

- Use connection pooling for database connections
- Implement caching for frequently accessed data
- Monitor memory usage and optimize imports
- Use async operations for I/O intensive tasks

### Scaling Considerations

- Horizontal scaling with multiple worker processes
- Load balancing with nginx or similar
- Database connection management
- Session management for stateful operations

## 🤝 Contributing

### Development Workflow

1. Create feature branch
2. Add new service/route following existing patterns
3. Update `.env.example` if new environment variables added
4. Test endpoints manually and with unit tests
5. Update documentation
6. Submit pull request

### Code Standards

- Follow PEP 8 Python style guidelines
- Use type hints where appropriate
- Add docstrings for functions and classes
- Handle errors gracefully with proper HTTP status codes