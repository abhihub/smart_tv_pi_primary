import os
import logging
import atexit
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)

def create_app():
    app = Flask(__name__)
    
    # Enable CORS
    CORS(app)
    
    # Initialize SocketIO
    socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)
    
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
    from api.admin_routes import admin_bp
    from api.contact_routes import contact_bp
    from api.update_routes import update_bp
    from api.remote_routes import remote_bp, register_socketio_events
    
    app.register_blueprint(twilio_bp, url_prefix='/api')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(call_bp, url_prefix='/api/calls')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(contact_bp, url_prefix='/api/contacts')
    app.register_blueprint(update_bp, url_prefix='/api/updates')
    app.register_blueprint(remote_bp, url_prefix='/api/remote')
    
    # Register SocketIO events for mobile remote control
    register_socketio_events(socketio)
    
    # Start background service
    from services.background_service import background_service
    
    # Start background tasks immediately when app is created
    try:
        background_service.start()
        logging.info("✅ Background service started with Flask app")
    except Exception as e:
        logging.error(f"❌ Failed to start background service: {e}")
    
    # Graceful shutdown
    def shutdown_background_service():
        """Stop background service on app shutdown"""
        try:
            background_service.stop()
            logging.info("🛑 Background service stopped gracefully")
        except Exception as e:
            logging.error(f"Error stopping background service: {e}")
    
    atexit.register(shutdown_background_service)
    
    return app, socketio

if __name__ == '__main__':
    app, socketio = create_app()
    port = int(os.getenv('PORT', 3001))
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)