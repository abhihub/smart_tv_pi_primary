import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Enable CORS
    CORS(app)
    
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
    
    app.register_blueprint(twilio_bp, url_prefix='/api')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(call_bp, url_prefix='/api/calls')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 3001))
    app.run(host='0.0.0.0', port=port, debug=True)