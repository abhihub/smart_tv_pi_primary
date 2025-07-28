from flask import Blueprint, request, jsonify
from services.contact_service import ContactService
from services.user_service import UserService
import logging

logger = logging.getLogger(__name__)

contact_bp = Blueprint('contacts', __name__)
contact_service = ContactService()
user_service = UserService()

@contact_bp.route('/add', methods=['POST'])
def add_contact():
    """
    Add a user to contact list
    
    Expected JSON payload:
    {
        "username": "ABC123",
        "contact_username": "XYZ789"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        username = data.get('username')
        contact_username = data.get('contact_username')
        
        if not username or not contact_username:
            return jsonify({'error': 'Username and contact_username are required'}), 400
        
        if username == contact_username:
            return jsonify({'error': 'Cannot add yourself as a contact'}), 400
        
        # Verify both users exist
        user = user_service.get_user_by_username(username)
        contact_user = user_service.get_user_by_username(contact_username)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not contact_user:
            return jsonify({'error': 'Contact user not found'}), 404
        
        # Update user's activity
        user_service.update_last_seen(username)
        
        # Add contact
        result = contact_service.add_contact(username, contact_username)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': result['message'],
                'contact': result.get('contact')
            }), 200
        else:
            return jsonify({
                'error': result['message']
            }), 400
            
    except Exception as e:
        logger.error(f"Failed to add contact: {e}")
        return jsonify({
            'error': f'Failed to add contact: {str(e)}'
        }), 500

@contact_bp.route('/remove', methods=['POST'])
def remove_contact():
    """
    Remove a user from contact list
    
    Expected JSON payload:
    {
        "username": "ABC123",
        "contact_username": "XYZ789"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        username = data.get('username')
        contact_username = data.get('contact_username')
        
        if not username or not contact_username:
            return jsonify({'error': 'Username and contact_username are required'}), 400
        
        # Update user's activity
        user_service.update_last_seen(username)
        
        # Remove contact
        success = contact_service.remove_contact(username, contact_username)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Contact removed successfully'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to remove contact or contact not found'
            }), 400
            
    except Exception as e:
        logger.error(f"Failed to remove contact: {e}")
        return jsonify({
            'error': f'Failed to remove contact: {str(e)}'
        }), 500

@contact_bp.route('/list/<username>', methods=['GET'])
def get_contact_list(username):
    """
    Get user's contact list with online status
    Returns contacts sorted by online status first, then by display name
    """
    try:
        # Verify user exists and update activity
        user = user_service.get_user_by_username(username)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_service.update_last_seen(username)
        
        # Get contact list with online status
        contacts = contact_service.get_contact_list_with_status(username)
        
        return jsonify({
            'success': True,
            'contacts': contacts,
            'count': len(contacts)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get contact list for {username}: {e}")
        return jsonify({
            'error': f'Failed to get contact list: {str(e)}'
        }), 500

@contact_bp.route('/mutual/<username>', methods=['GET'])
def get_mutual_contacts(username):
    """
    Get list of users who have this user in their contact list (mutual connections)
    """
    try:
        # Verify user exists and update activity
        user = user_service.get_user_by_username(username)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_service.update_last_seen(username)
        
        # Get mutual contacts
        mutual_contacts = contact_service.get_mutual_contacts(username)
        
        return jsonify({
            'success': True,
            'mutual_contacts': mutual_contacts,
            'count': len(mutual_contacts)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get mutual contacts for {username}: {e}")
        return jsonify({
            'error': f'Failed to get mutual contacts: {str(e)}'
        }), 500

@contact_bp.route('/search', methods=['GET'])
def search_users():
    """
    Search for users by username or display name
    Query params: q (search query), limit (optional, default 20)
    """
    try:
        query = request.args.get('q', '').strip()
        limit = request.args.get('limit', 20, type=int)
        current_user = request.args.get('current_user', '')
        
        if not query:
            return jsonify({'error': 'Search query is required'}), 400
        
        if len(query) < 2:
            return jsonify({'error': 'Search query must be at least 2 characters'}), 400
        
        # Search users
        users = contact_service.search_users(query, limit, exclude_username=current_user)
        
        return jsonify({
            'success': True,
            'users': users,
            'count': len(users),
            'query': query
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to search users: {e}")
        return jsonify({
            'error': f'User search failed: {str(e)}'
        }), 500

@contact_bp.route('/favorite', methods=['POST'])
def toggle_favorite():
    """
    Toggle favorite status of a contact
    
    Expected JSON payload:
    {
        "username": "ABC123",
        "contact_username": "XYZ789",
        "is_favorite": true
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400
        
        username = data.get('username')
        contact_username = data.get('contact_username')
        is_favorite = data.get('is_favorite', False)
        
        if not username or not contact_username:
            return jsonify({'error': 'Username and contact_username are required'}), 400
        
        # Update user's activity
        user_service.update_last_seen(username)
        
        # Toggle favorite status
        success = contact_service.set_favorite_status(username, contact_username, is_favorite)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Contact {"added to" if is_favorite else "removed from"} favorites'
            }), 200
        else:
            return jsonify({
                'error': 'Failed to update favorite status or contact not found'
            }), 400
            
    except Exception as e:
        logger.error(f"Failed to toggle favorite: {e}")
        return jsonify({
            'error': f'Failed to update favorite status: {str(e)}'
        }), 500

@contact_bp.route('/stats/<username>', methods=['GET'])
def get_contact_stats(username):
    """Get contact statistics for a user"""
    try:
        # Verify user exists and update activity
        user = user_service.get_user_by_username(username)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_service.update_last_seen(username)
        
        # Get contact stats
        stats = contact_service.get_contact_stats(username)
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get contact stats for {username}: {e}")
        return jsonify({
            'error': f'Failed to get contact stats: {str(e)}'
        }), 500

@contact_bp.route('/health', methods=['GET'])
def contact_service_health():
    """Health check for contact service"""
    try:
        # Get some basic stats
        health_data = contact_service.get_health_status()
        
        return jsonify({
            'service': 'contact_management',
            'status': 'healthy',
            **health_data
        }), 200
        
    except Exception as e:
        logger.error(f"Contact service health check failed: {e}")
        return jsonify({
            'service': 'contact_management',
            'status': 'unhealthy',
            'error': str(e)
        }), 500