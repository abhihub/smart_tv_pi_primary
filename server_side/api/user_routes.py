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
        "userid": "APP123456789",
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
        
        userid = data.get('userid')
        username = data.get('username')
        
        if not userid:
            return jsonify({'error': 'userid is required'}), 400
        
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        # Validate userid format (app-generated, should be unique)
        if not userid or len(userid) < 5:
            return jsonify({
                'error': 'userid must be at least 5 characters long'
            }), 400
        
        # Validate username format (5 alphanumeric characters)
        if not username.isalnum() or len(username) != 5:
            return jsonify({
                'error': 'Username must be exactly 5 alphanumeric characters'
            }), 400
        
        display_name = data.get('display_name')
        device_type = data.get('device_type', 'smarttv')
        metadata = data.get('metadata', {})
        
        # Register or update user
        result = user_service.register_or_update_user(
            userid=userid,
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

@user_bp.route('/friends/request', methods=['POST'])
def send_friend_request():
    """
    Send a friend request
    
    Expected JSON payload:
    {
        "sender": "CYJXC",
        "receiver": "AJ84H",
        "message": "Let's be friends!"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        sender = data.get('sender')
        receiver = data.get('receiver')
        message = data.get('message')
        
        if not sender or not receiver:
            return jsonify({'error': 'Sender and receiver usernames are required'}), 400
        
        if sender == receiver:
            return jsonify({'error': 'Cannot send friend request to yourself'}), 400
        
        success = user_service.send_friend_request(sender, receiver, message)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Friend request sent successfully'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to send friend request or already friends'
            }), 400
            
    except Exception as e:
        logger.error(f"Failed to send friend request: {e}")
        return jsonify({
            'error': f'Friend request failed: {str(e)}'
        }), 500

@user_bp.route('/friends/accept', methods=['POST'])
def accept_friend_request():
    """
    Accept a friend request
    
    Expected JSON payload:
    {
        "sender": "CYJXC",
        "receiver": "AJ84H"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        sender = data.get('sender')
        receiver = data.get('receiver')
        
        if not sender or not receiver:
            return jsonify({'error': 'Sender and receiver usernames are required'}), 400
        
        success = user_service.accept_friend_request(sender, receiver)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Friend request accepted'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to accept friend request'
            }), 400
            
    except Exception as e:
        logger.error(f"Failed to accept friend request: {e}")
        return jsonify({
            'error': f'Friend request acceptance failed: {str(e)}'
        }), 500

@user_bp.route('/friends/decline', methods=['POST'])
def decline_friend_request():
    """
    Decline a friend request
    
    Expected JSON payload:
    {
        "sender": "CYJXC",
        "receiver": "AJ84H"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        sender = data.get('sender')
        receiver = data.get('receiver')
        
        if not sender or not receiver:
            return jsonify({'error': 'Sender and receiver usernames are required'}), 400
        
        success = user_service.decline_friend_request(sender, receiver)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Friend request declined'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to decline friend request'
            }), 400
            
    except Exception as e:
        logger.error(f"Failed to decline friend request: {e}")
        return jsonify({
            'error': f'Friend request decline failed: {str(e)}'
        }), 500

@user_bp.route('/friends/remove', methods=['POST'])
def remove_friend():
    """
    Remove a friend
    
    Expected JSON payload:
    {
        "username1": "CYJXC",
        "username2": "AJ84H"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        username1 = data.get('username1')
        username2 = data.get('username2')
        
        if not username1 or not username2:
            return jsonify({'error': 'Both usernames are required'}), 400
        
        success = user_service.remove_friend(username1, username2)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Friend removed successfully'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to remove friend'
            }), 400
            
    except Exception as e:
        logger.error(f"Failed to remove friend: {e}")
        return jsonify({
            'error': f'Friend removal failed: {str(e)}'
        }), 500

@user_bp.route('/friends/block', methods=['POST'])
def block_user():
    """
    Block a user
    
    Expected JSON payload:
    {
        "username": "CYJXC",
        "blocked_username": "AJ84H"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        username = data.get('username')
        blocked_username = data.get('blocked_username')
        
        if not username or not blocked_username:
            return jsonify({'error': 'Both usernames are required'}), 400
        
        if username == blocked_username:
            return jsonify({'error': 'Cannot block yourself'}), 400
        
        success = user_service.block_user(username, blocked_username)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'User blocked successfully'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to block user'
            }), 400
            
    except Exception as e:
        logger.error(f"Failed to block user: {e}")
        return jsonify({
            'error': f'User blocking failed: {str(e)}'
        }), 500

@user_bp.route('/friends/unblock', methods=['POST'])
def unblock_user():
    """
    Unblock a user
    
    Expected JSON payload:
    {
        "username": "CYJXC",
        "blocked_username": "AJ84H"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        username = data.get('username')
        blocked_username = data.get('blocked_username')
        
        if not username or not blocked_username:
            return jsonify({'error': 'Both usernames are required'}), 400
        
        success = user_service.unblock_user(username, blocked_username)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'User unblocked successfully'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to unblock user'
            }), 400
            
    except Exception as e:
        logger.error(f"Failed to unblock user: {e}")
        return jsonify({
            'error': f'User unblocking failed: {str(e)}'
        }), 500

@user_bp.route('/friends/<username>', methods=['GET'])
def get_friends_list(username):
    """Get user's friends list"""
    try:
        friends = user_service.get_friends_list(username)
        
        return jsonify({
            'success': True,
            'friends': friends,
            'count': len(friends)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get friends list: {e}")
        return jsonify({
            'error': f'Failed to get friends list: {str(e)}'
        }), 500

@user_bp.route('/friends/requests/pending/<username>', methods=['GET'])
def get_pending_friend_requests(username):
    """Get pending friend requests for a user"""
    try:
        requests = user_service.get_pending_friend_requests(username)
        
        return jsonify({
            'success': True,
            'requests': requests,
            'count': len(requests)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get pending friend requests: {e}")
        return jsonify({
            'error': f'Failed to get pending friend requests: {str(e)}'
        }), 500

@user_bp.route('/friends/requests/sent/<username>', methods=['GET'])
def get_sent_friend_requests(username):
    """Get sent friend requests for a user"""
    try:
        requests = user_service.get_sent_friend_requests(username)
        
        return jsonify({
            'success': True,
            'requests': requests,
            'count': len(requests)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get sent friend requests: {e}")
        return jsonify({
            'error': f'Failed to get sent friend requests: {str(e)}'
        }), 500

@user_bp.route('/friends/blocked/<username>', methods=['GET'])
def get_blocked_users(username):
    """Get list of blocked users"""
    try:
        blocked = user_service.get_blocked_users(username)
        
        return jsonify({
            'success': True,
            'blocked': blocked,
            'count': len(blocked)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get blocked users: {e}")
        return jsonify({
            'error': f'Failed to get blocked users: {str(e)}'
        }), 500

@user_bp.route('/search', methods=['GET'])
def search_users():
    """Search for users by username or display name"""
    try:
        query = request.args.get('q', '').strip()
        current_user = request.args.get('current_user')
        limit = request.args.get('limit', 20, type=int)
        
        if not query or len(query) < 2:
            return jsonify({
                'success': True,
                'users': [],
                'count': 0
            }), 200
        
        users = user_service.search_users(query, current_user, limit)
        
        return jsonify({
            'success': True,
            'users': users,
            'count': len(users)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to search users: {e}")
        return jsonify({
            'error': f'User search failed: {str(e)}'
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