from flask import Blueprint, request, jsonify
from services.twilio_service import TwilioService

twilio_bp = Blueprint('twilio', __name__)
twilio_service = TwilioService()

@twilio_bp.route('/token', methods=['POST'])
def generate_token():
    """
    Generate Twilio access token for video calling
    
    Expected JSON payload:
    {
        "identity": "user_identifier",
        "roomName": "room_name"
    }
    """
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        # Extract required fields
        identity = data.get('identity')
        room_name = data.get('roomName')
        
        # Validate required fields
        if not identity or not room_name:
            return jsonify({
                'error': 'Identity and room name are required'
            }), 400
        
        # Generate token
        token = twilio_service.generate_access_token(identity, room_name)
        
        return jsonify({
            'token': token
        }), 200
        
    except ValueError as e:
        return jsonify({
            'error': f'Configuration error: {str(e)}'
        }), 500
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to generate token: {str(e)}'
        }), 500

@twilio_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for Twilio service
    """
    try:
        is_configured = twilio_service.validate_credentials()
        
        return jsonify({
            'status': 'healthy' if is_configured else 'misconfigured',
            'service': 'twilio',
            'configured': is_configured
        }), 200 if is_configured else 500
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'service': 'twilio',
            'error': str(e)
        }), 500