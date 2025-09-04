from flask import Blueprint, request, jsonify
from services.call_service import CallService
from services.user_service import UserService
import logging

logger = logging.getLogger(__name__)

call_bp = Blueprint('calls', __name__)
call_service = CallService()
user_service = UserService()

@call_bp.route('/online-users', methods=['GET'])
def get_online_users():
    """Get list of users currently online, optionally filtered by contact list"""
    try:
        # Get current user from query param (optional)
        current_user = request.args.get('exclude_user')
        # Check if we should filter by contacts only
        contacts_only = request.args.get('contacts_only', 'false').lower() == 'true'
        # Check if we should include offline users
        include_offline = request.args.get('include_offline', 'true').lower() == 'true'
        
        users = call_service.get_online_users(
            exclude_username=current_user, 
            contacts_only=contacts_only,
            include_offline=include_offline
        )
        
        return jsonify({
            'success': True,
            'users': users,
            'count': len(users),
            'contacts_only': contacts_only,
            'include_offline': include_offline
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get online users: {e}")
        return jsonify({
            'error': f'Failed to get online users: {str(e)}'
        }), 500

@call_bp.route('/invite', methods=['POST'])
def initiate_call():
    """
    Initiate a call to another user
    
    Expected JSON payload:
    {
        "caller": "CYJXC",
        "callee": "AJ84H"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        caller = data.get('caller')
        callee = data.get('callee')
        
        if not caller or not callee:
            return jsonify({'error': 'Caller and callee usernames are required'}), 400
        
        if caller == callee:
            return jsonify({'error': 'Cannot call yourself'}), 400
        
        # Verify both users exist and update caller's last seen
        caller_user = user_service.get_user_by_username(caller)
        callee_user = user_service.get_user_by_username(callee)
        
        if not caller_user:
            return jsonify({'error': 'Caller not found'}), 404
        
        if not callee_user:
            return jsonify({'error': 'Callee not found'}), 404
        
        # Update caller's activity
        user_service.update_last_seen(caller)
        
        # Initiate the call
        call_result = call_service.initiate_call(caller, callee)
        
        if not call_result:
            return jsonify({'error': 'Failed to initiate call or call already exists'}), 400
        
        # Here you would typically emit a WebSocket event to notify the callee
        # For now, we'll just return the call details
        
        return jsonify({
            'success': True,
            'call': call_result
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to initiate call: {e}")
        return jsonify({
            'error': f'Call initiation failed: {str(e)}'
        }), 500

@call_bp.route('/answer', methods=['POST'])
def answer_call():
    """
    Answer an incoming call
    
    Expected JSON payload:
    {
        "call_id": "uuid-string",
        "callee": "AJ84H"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        call_id = data.get('call_id')
        callee = data.get('callee')
        
        if not call_id or not callee:
            return jsonify({'error': 'Call ID and callee username are required'}), 400
        
        # Answer the call
        call_result = call_service.answer_call(call_id, callee)
        
        if not call_result:
            return jsonify({'error': 'Failed to answer call or call not found'}), 400
        
        # Update callee's activity
        user_service.update_last_seen(callee)
        
        return jsonify({
            'success': True,
            'call': call_result
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to answer call: {e}")
        return jsonify({
            'error': f'Call answer failed: {str(e)}'
        }), 500

@call_bp.route('/decline', methods=['POST'])
def decline_call():
    """
    Decline an incoming call
    
    Expected JSON payload:
    {
        "call_id": "uuid-string",
        "callee": "AJ84H"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        call_id = data.get('call_id')
        callee = data.get('callee')
        
        if not call_id or not callee:
            return jsonify({'error': 'Call ID and callee username are required'}), 400
        
        # Decline the call
        success = call_service.decline_call(call_id, callee)
        
        if not success:
            return jsonify({'error': 'Failed to decline call or call not found'}), 400
        
        # Update callee's activity
        user_service.update_last_seen(callee)
        
        return jsonify({
            'success': True,
            'message': 'Call declined'
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to decline call: {e}")
        return jsonify({
            'error': f'Call decline failed: {str(e)}'
        }), 500

@call_bp.route('/cancel', methods=['POST'])
def cancel_call():
    """
    Cancel an outgoing call
    
    Expected JSON payload:
    {
        "call_id": "uuid-string",
        "caller": "CYJXC"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        call_id = data.get('call_id')
        caller = data.get('caller')
        
        if not call_id or not caller:
            return jsonify({'error': 'Call ID and caller username are required'}), 400
        
        # Cancel the call
        success = call_service.cancel_call(call_id, caller)
        
        if not success:
            return jsonify({'error': 'Failed to cancel call or call not found'}), 400
        
        return jsonify({
            'success': True,
            'message': 'Call cancelled'
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to cancel call: {e}")
        return jsonify({
            'error': f'Call cancellation failed: {str(e)}'
        }), 500

@call_bp.route('/end', methods=['POST'])
def end_call():
    """
    End an active call
    
    Expected JSON payload:
    {
        "call_id": "uuid-string",
        "username": "CYJXC"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        call_id = data.get('call_id')
        username = data.get('username')
        
        if not call_id or not username:
            return jsonify({'error': 'Call ID and username are required'}), 400
        
        # End the call
        success = call_service.end_call(call_id, username)
        
        if not success:
            return jsonify({'error': 'Failed to end call or call not found'}), 400
        
        return jsonify({
            'success': True,
            'message': 'Call ended'
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to end call: {e}")
        return jsonify({
            'error': f'Call end failed: {str(e)}'
        }), 500

@call_bp.route('/status/<call_id>', methods=['GET'])
def get_call_status(call_id):
    """Get current status of a specific call"""
    try:
        call_status = call_service.get_call_status(call_id)
        
        if not call_status:
            return jsonify({'error': 'Call not found'}), 404
        
        return jsonify({
            'success': True,
            'call': call_status
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get call status: {e}")
        return jsonify({
            'error': f'Failed to get call status: {str(e)}'
        }), 500

@call_bp.route('/pending/<username>', methods=['GET'])
def get_pending_calls(username):
    """Get pending calls for a specific user"""
    try:
        # Update user's last seen
        user_service.update_last_seen(username)
        
        pending_calls = call_service.get_pending_calls_for_user(username)
        
        return jsonify({
            'success': True,
            'calls': pending_calls,
            'count': len(pending_calls)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get pending calls: {e}")
        return jsonify({
            'error': f'Failed to get pending calls: {str(e)}'
        }), 500

@call_bp.route('/presence', methods=['POST'])
def update_presence():
    """
    Update user presence status
    
    Expected JSON payload:
    {
        "username": "CYJXC",
        "status": "online",
        "socket_id": "optional_socket_id"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        username = data.get('username')
        status = data.get('status', 'online')
        socket_id = data.get('socket_id')
        
        if not username:
            return jsonify({'error': 'Username is required'}), 400
        
        # Update presence
        success = call_service.update_presence(username, status, socket_id)
        
        if not success:
            return jsonify({'error': 'Failed to update presence'}), 400
        
        # Update user's last seen
        user_service.update_last_seen(username)
        
        return jsonify({
            'success': True,
            'message': 'Presence updated'
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to update presence: {e}")
        return jsonify({
            'error': f'Presence update failed: {str(e)}'
        }), 500

@call_bp.route('/cleanup', methods=['POST'])
def cleanup_old_calls():
    """Clean up old completed calls (admin endpoint)"""
    try:
        hours = request.json.get('hours', 24) if request.json else 24
        
        count = call_service.cleanup_old_calls(hours)
        
        return jsonify({
            'success': True,
            'message': f'Cleaned up {count} old calls'
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to cleanup old calls: {e}")
        return jsonify({
            'error': f'Cleanup failed: {str(e)}'
        }), 500

@call_bp.route('/health', methods=['GET'])
def call_service_health():
    """Health check for call service"""
    try:
        # Get some basic stats
        online_users = call_service.get_online_users()
        
        return jsonify({
            'service': 'call_management',
            'status': 'healthy',
            'online_users_count': len(online_users),
            'timestamp': f"{__import__('datetime').datetime.now().isoformat()}"
        }), 200
        
    except Exception as e:
        logger.error(f"Call service health check failed: {e}")
        return jsonify({
            'service': 'call_management',
            'status': 'unhealthy',
            'error': str(e)
        }), 500