from flask import Blueprint, request, jsonify
from services.user_service import UserService
import logging

logger = logging.getLogger(__name__)

user_bp = Blueprint('user', __name__)
user_service = UserService()

@user_bp.route('/register', methods=['POST'])
def register_user():
    """
    Register or update a user
    
    Expected JSON payload:
    {
        "username": "ABC123",
        "display_name": "Optional display name",
        "device_type": "smarttv",
        "metadata": {
            "device_model": "Samsung TV",
            "app_version": "1.0.0"
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        username = data.get('username')
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        # Validate username format (allow device IDs which can be UUIDs or legacy 5-char usernames)
        if len(username) < 5 or len(username) > 50:
            return jsonify({
                'error': 'Username must be between 5 and 50 characters'
            }), 400
        
        # Allow alphanumeric characters and hyphens (for UUIDs)
        if not all(c.isalnum() or c == '-' for c in username):
            return jsonify({
                'error': 'Username must contain only alphanumeric characters and hyphens'
            }), 400
        
        display_name = data.get('display_name')
        device_type = data.get('device_type', 'smarttv')
        metadata = data.get('metadata', {})
        
        # Register or update user
        result = user_service.register_or_update_user(
            username=username,
            display_name=display_name,
            device_type=device_type,
            metadata=metadata
        )
        
        return jsonify({
            'success': True,
            'user': result
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to register user: {e}")
        return jsonify({
            'error': f'Registration failed: {str(e)}'
        }), 500

@user_bp.route('/profile/<username>', methods=['GET'])
def get_user_profile(username):
    """Get user profile and statistics"""
    try:
        user = user_service.get_user_by_username(username)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Update last seen
        user_service.update_last_seen(username)
        
        # Get user stats
        stats = user_service.get_user_stats(username)
        
        return jsonify({
            'success': True,
            'user': stats
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get user profile for {username}: {e}")
        return jsonify({
            'error': f'Failed to get profile: {str(e)}'
        }), 500

@user_bp.route('/profile/<username>', methods=['PUT'])
def update_user_profile(username):
    """
    Update user profile
    
    Expected JSON payload:
    {
        "display_name": "New Display Name",
        "metadata": {
            "device_model": "Updated model"
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        user = user_service.get_user_by_username(username)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        display_name = data.get('display_name')
        metadata = data.get('metadata')
        
        success = user_service.update_user_info(
            username=username,
            display_name=display_name,
            metadata=metadata
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Profile updated successfully'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to update profile'
            }), 500
            
    except Exception as e:
        logger.error(f"Failed to update user profile for {username}: {e}")
        return jsonify({
            'error': f'Update failed: {str(e)}'
        }), 500

@user_bp.route('/session/start', methods=['POST'])
def start_session():
    """
    Start a new user session
    
    Expected JSON payload:
    {
        "username": "ABC123",
        "session_type": "video_call",
        "room_name": "family-room"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        username = data.get('username')
        session_type = data.get('session_type', 'video_call')
        room_name = data.get('room_name')
        
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        session_token = user_service.create_session(
            username=username,
            session_type=session_type,
            room_name=room_name
        )
        
        if session_token:
            return jsonify({
                'success': True,
                'session_token': session_token,
                'username': username,
                'session_type': session_type,
                'room_name': room_name
            }), 200
        else:
            return jsonify({
                'error': 'Failed to create session'
            }), 500
            
    except Exception as e:
        logger.error(f"Failed to start session: {e}")
        return jsonify({
            'error': f'Session creation failed: {str(e)}'
        }), 500

@user_bp.route('/session/end', methods=['POST'])
def end_session():
    """
    End a user session
    
    Expected JSON payload:
    {
        "session_token": "ABC123_1234567890"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        session_token = data.get('session_token')
        
        if not session_token:
            return jsonify({'error': 'Session token is required'}), 400
        
        success = user_service.end_session(session_token)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Session ended successfully'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to end session'
            }), 500
            
    except Exception as e:
        logger.error(f"Failed to end session: {e}")
        return jsonify({
            'error': f'Session termination failed: {str(e)}'
        }), 500

@user_bp.route('/game/score', methods=['POST'])
def save_game_score():
    """
    Save game score for user
    
    Expected JSON payload:
    {
        "username": "ABC123",
        "game_type": "trivia",
        "score": 85,
        "questions_answered": 10,
        "correct_answers": 8,
        "game_duration": 300,
        "room_name": "family-room"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        username = data.get('username')
        game_type = data.get('game_type', 'trivia')
        score = data.get('score', 0)
        questions_answered = data.get('questions_answered', 0)
        correct_answers = data.get('correct_answers', 0)
        game_duration = data.get('game_duration', 0)
        room_name = data.get('room_name')
        
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        success = user_service.save_game_score(
            username=username,
            game_type=game_type,
            score=score,
            questions_answered=questions_answered,
            correct_answers=correct_answers,
            game_duration=game_duration,
            room_name=room_name
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Game score saved successfully'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to save game score'
            }), 500
            
    except Exception as e:
        logger.error(f"Failed to save game score: {e}")
        return jsonify({
            'error': f'Score saving failed: {str(e)}'
        }), 500

@user_bp.route('/active', methods=['GET'])
def get_active_users():
    """Get list of recently active users"""
    try:
        limit = request.args.get('limit', 50, type=int)
        users = user_service.get_active_users(limit=limit)
        
        return jsonify({
            'success': True,
            'users': users,
            'count': len(users)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get active users: {e}")
        return jsonify({
            'error': f'Failed to get active users: {str(e)}'
        }), 500

@user_bp.route('/health', methods=['GET'])
def user_service_health():
    """Health check for user service"""
    try:
        health_data = user_service.db.health_check()
        
        return jsonify({
            'service': 'user_management',
            **health_data
        }), 200 if health_data['status'] == 'healthy' else 500
        
    except Exception as e:
        logger.error(f"User service health check failed: {e}")
        return jsonify({
            'service': 'user_management',
            'status': 'unhealthy',
            'error': str(e)
        }), 500