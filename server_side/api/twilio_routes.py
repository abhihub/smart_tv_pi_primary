from flask import Blueprint, request, jsonify
from services.twilio_service import TwilioService
from services.user_service import UserService
import logging

logger = logging.getLogger(__name__)

twilio_bp = Blueprint('twilio', __name__)
twilio_service = TwilioService()
user_service = UserService()

@twilio_bp.route('/token', methods=['POST'])
def generate_token():
    """
    Generate Twilio access token for video calling with user tracking
    
    Expected JSON payload:
    {
        "identity": "ABC123",
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
        
        # Verify user exists and update last seen
        user = user_service.get_user_by_username(identity)
        if not user:
            logger.warning(f"Token requested for unregistered user: {identity}")
            # Auto-register user with basic info
            user_service.register_or_update_user(
                username=identity,
                display_name=identity,
                device_type='smarttv'
            )
        else:
            # Update user's last seen
            user_service.update_last_seen(identity)
        
        # Create session for video call
        session_token = user_service.create_session(
            username=identity,
            session_type='video_call',
            room_name=room_name
        )
        
        # Generate Twilio token
        token = twilio_service.generate_access_token(identity, room_name)
        
        logger.info(f"Generated token for user {identity} in room {room_name}")
        
        return jsonify({
            'token': token,
            'session_token': session_token,
            'identity': identity,
            'roomName': room_name
        }), 200
        
    except ValueError as e:
        return jsonify({
            'error': f'Configuration error: {str(e)}'
        }), 500
        
    except Exception as e:
        logger.error(f"Failed to generate token for {identity}: {e}")
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