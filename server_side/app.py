import os
import logging
from datetime import datetime
from flask import Flask, request
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
def setup_logging():
    """Setup comprehensive logging for the Flask app"""
    
    # Create logs directory if it doesn't exist
    log_dir = 'logs'
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        handlers=[
            # File handler - logs everything to file
            logging.FileHandler(f'{log_dir}/smarttv_server.log'),
            # Console handler - logs to terminal
            logging.StreamHandler()
        ]
    )
    
    # Create specific loggers
    app_logger = logging.getLogger('smarttv.app')
    api_logger = logging.getLogger('smarttv.api')
    system_logger = logging.getLogger('smarttv.system')
    
    # Set levels
    app_logger.setLevel(logging.INFO)
    api_logger.setLevel(logging.INFO)
    system_logger.setLevel(logging.INFO)
    
    return app_logger, api_logger, system_logger

# Setup logging
app_logger, api_logger, system_logger = setup_logging()

def create_app():
    app = Flask(__name__)
    
    # Enable CORS
    CORS(app)
    
    # Add minimal request logging for important endpoints only
    @app.before_request
    def log_request_info():
        """Log only important requests"""
        if request.path.startswith('/api/system/') or request.path.startswith('/api/calls/'):
            api_logger.info(f"🌐 {request.method} {request.path} - {request.remote_addr}")
    
    @app.after_request  
    def log_response_info(response):
        """Log responses for important endpoints only"""
        if request.path.startswith('/api/system/') or request.path.startswith('/api/calls/'):
            api_logger.info(f"📤 {response.status_code} - {request.method} {request.path}")
        return response
    
    # Add basic routes
    @app.route('/')
    def home():
        return {'message': 'SmartTV Server is running', 'status': 'ok'}
    
    @app.route('/health')
    def health():
        return {'status': 'healthy', 'server': 'SmartTV'}
    
    # Register blueprints
    from api.twilio_routes import twilio_bp
    from api.user_routes import user_bp
    from api.call_routes import call_bp
    from api.system_routes import system_bp
    
    app.register_blueprint(twilio_bp, url_prefix='/api')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(call_bp, url_prefix='/api/calls')
    app.register_blueprint(system_bp, url_prefix='/api/system')
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 3001))
    
    app_logger.info(f"🚀 SmartTV Server starting on port {port}")
    
    try:
        app.run(host='0.0.0.0', port=port, debug=True)
    except KeyboardInterrupt:
        app_logger.info("🛑 Server stopped")
    except Exception as e:
        app_logger.error(f"❌ Server error: {e}")
    finally:
        app_logger.info("👋 Server shutdown")