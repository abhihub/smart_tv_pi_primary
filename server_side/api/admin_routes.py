from flask import Blueprint, jsonify
from database.database import db_manager
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/users')
def get_all_users():
    """Get all users from the database"""
    try:
        query = """
        SELECT id, username, display_name, device_type, created_at, 
               last_seen, is_active, metadata
        FROM users 
        ORDER BY created_at DESC
        """
        users = db_manager.execute_query(query, fetch='all')
        
        # Convert rows to dictionaries
        users_list = []
        for user in users or []:
            users_list.append({
                'id': user['id'],
                'username': user['username'],
                'display_name': user['display_name'],
                'device_type': user['device_type'],
                'created_at': user['created_at'],
                'last_seen': user['last_seen'],
                'is_active': bool(user['is_active']),
                'metadata': user['metadata']
            })
        
        return jsonify({
            'success': True,
            'users': users_list,
            'count': len(users_list)
        })
        
    except Exception as e:
        logger.error(f"Failed to get users: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/sessions')
def get_all_sessions():
    """Get all user sessions from the database"""
    try:
        query = """
        SELECT s.id, s.user_id, s.session_token, s.room_name, s.session_type,
               s.started_at, s.ended_at, s.is_active, u.username
        FROM user_sessions s
        LEFT JOIN users u ON s.user_id = u.id
        ORDER BY s.started_at DESC
        """
        sessions = db_manager.execute_query(query, fetch='all')
        
        # Convert rows to dictionaries
        sessions_list = []
        for session in sessions or []:
            sessions_list.append({
                'id': session['id'],
                'user_id': session['user_id'],
                'username': session['username'],
                'session_token': session['session_token'],
                'room_name': session['room_name'],
                'session_type': session['session_type'],
                'started_at': session['started_at'],
                'ended_at': session['ended_at'],
                'is_active': bool(session['is_active'])
            })
        
        return jsonify({
            'success': True,
            'sessions': sessions_list,
            'count': len(sessions_list)
        })
        
    except Exception as e:
        logger.error(f"Failed to get sessions: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/calls')
def get_all_calls():
    """Get all calls from the database"""
    try:
        query = """
        SELECT c.id, c.caller_id, c.callee_id, c.call_id, c.room_name,
               c.status, c.created_at, c.answered_at, c.ended_at, c.duration,
               u1.username as caller_username, u2.username as callee_username
        FROM calls c
        LEFT JOIN users u1 ON c.caller_id = u1.id
        LEFT JOIN users u2 ON c.callee_id = u2.id
        ORDER BY c.created_at DESC
        """
        calls = db_manager.execute_query(query, fetch='all')
        
        # Convert rows to dictionaries
        calls_list = []
        for call in calls or []:
            calls_list.append({
                'id': call['id'],
                'caller_id': call['caller_id'],
                'callee_id': call['callee_id'],
                'caller_username': call['caller_username'],
                'callee_username': call['callee_username'],
                'call_id': call['call_id'],
                'room_name': call['room_name'],
                'status': call['status'],
                'created_at': call['created_at'],
                'answered_at': call['answered_at'],
                'ended_at': call['ended_at'],
                'duration': call['duration']
            })
        
        return jsonify({
            'success': True,
            'calls': calls_list,
            'count': len(calls_list)
        })
        
    except Exception as e:
        logger.error(f"Failed to get calls: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/presence')
def get_all_presence():
    """Get all user presence data from the database"""
    try:
        query = """
        SELECT p.id, p.user_id, p.status, p.last_seen, p.socket_id, p.updated_at,
               u.username
        FROM user_presence p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.updated_at DESC
        """
        presence = db_manager.execute_query(query, fetch='all')
        
        # Convert rows to dictionaries
        presence_list = []
        for p in presence or []:
            presence_list.append({
                'id': p['id'],
                'user_id': p['user_id'],
                'username': p['username'],
                'status': p['status'],
                'last_seen': p['last_seen'],
                'socket_id': p['socket_id'],
                'updated_at': p['updated_at']
            })
        
        return jsonify({
            'success': True,
            'presence': presence_list,
            'count': len(presence_list)
        })
        
    except Exception as e:
        logger.error(f"Failed to get presence: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/contacts')
def get_all_contacts():
    """Get all user contacts from the database"""
    try:
        query = """
        SELECT uc.id, uc.user_id, uc.contact_user_id, uc.added_at, uc.is_favorite,
               u1.username as user_username, u1.display_name as user_display_name,
               u2.username as contact_username, u2.display_name as contact_display_name
        FROM user_contacts uc
        LEFT JOIN users u1 ON uc.user_id = u1.id
        LEFT JOIN users u2 ON uc.contact_user_id = u2.id
        ORDER BY uc.added_at DESC
        """
        contacts = db_manager.execute_query(query, fetch='all')
        
        # Convert rows to dictionaries
        contacts_list = []
        for contact in contacts or []:
            contacts_list.append({
                'id': contact['id'],
                'user_id': contact['user_id'],
                'contact_user_id': contact['contact_user_id'],
                'user_username': contact['user_username'],
                'user_display_name': contact['user_display_name'],
                'contact_username': contact['contact_username'],
                'contact_display_name': contact['contact_display_name'],
                'added_at': contact['added_at'],
                'is_favorite': bool(contact['is_favorite'])
            })
        
        return jsonify({
            'success': True,
            'contacts': contacts_list,
            'count': len(contacts_list)
        })
        
    except Exception as e:
        logger.error(f"Failed to get contacts: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/scores')
def get_all_game_scores():
    """Get all game scores from the database"""
    try:
        query = """
        SELECT g.id, g.user_id, g.game_type, g.score, g.questions_answered,
               g.correct_answers, g.game_duration, g.played_at, g.room_name,
               u.username
        FROM game_scores g
        LEFT JOIN users u ON g.user_id = u.id
        ORDER BY g.played_at DESC
        """
        scores = db_manager.execute_query(query, fetch='all')
        
        # Convert rows to dictionaries
        scores_list = []
        for score in scores or []:
            scores_list.append({
                'id': score['id'],
                'user_id': score['user_id'],
                'username': score['username'],
                'game_type': score['game_type'],
                'score': score['score'],
                'questions_answered': score['questions_answered'],
                'correct_answers': score['correct_answers'],
                'game_duration': score['game_duration'],
                'played_at': score['played_at'],
                'room_name': score['room_name']
            })
        
        return jsonify({
            'success': True,
            'scores': scores_list,
            'count': len(scores_list)
        })
        
    except Exception as e:
        logger.error(f"Failed to get game scores: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/stats')
def get_database_stats():
    """Get summary statistics for the database"""
    try:
        stats = {}
        
        # Total users
        total_users = db_manager.execute_query(
            "SELECT COUNT(*) as count FROM users", 
            fetch='one'
        )
        stats['total_users'] = total_users['count'] if total_users else 0
        
        # Active users (seen in last 24 hours)
        active_users = db_manager.execute_query(
            "SELECT COUNT(*) as count FROM users WHERE last_seen > datetime('now', '-1 day')", 
            fetch='one'
        )
        stats['active_users'] = active_users['count'] if active_users else 0
        
        # Total calls
        total_calls = db_manager.execute_query(
            "SELECT COUNT(*) as count FROM calls", 
            fetch='one'
        )
        stats['total_calls'] = total_calls['count'] if total_calls else 0
        
        # Active sessions
        active_sessions = db_manager.execute_query(
            "SELECT COUNT(*) as count FROM user_sessions WHERE is_active = 1", 
            fetch='one'
        )
        stats['active_sessions'] = active_sessions['count'] if active_sessions else 0
        
        # Online users
        online_users = db_manager.execute_query(
            "SELECT COUNT(*) as count FROM user_presence WHERE status = 'online'", 
            fetch='one'
        )
        stats['online_users'] = online_users['count'] if online_users else 0
        
        # Recent calls (last 24 hours)
        recent_calls = db_manager.execute_query(
            "SELECT COUNT(*) as count FROM calls WHERE created_at > datetime('now', '-1 day')", 
            fetch='one'
        )
        stats['recent_calls'] = recent_calls['count'] if recent_calls else 0
        
        # Total contacts
        total_contacts = db_manager.execute_query(
            "SELECT COUNT(*) as count FROM user_contacts", 
            fetch='one'
        )
        stats['total_contacts'] = total_contacts['count'] if total_contacts else 0
        
        # Users with contacts
        users_with_contacts = db_manager.execute_query(
            "SELECT COUNT(DISTINCT user_id) as count FROM user_contacts", 
            fetch='one'
        )
        stats['users_with_contacts'] = users_with_contacts['count'] if users_with_contacts else 0
        
        # Favorite contacts
        favorite_contacts = db_manager.execute_query(
            "SELECT COUNT(*) as count FROM user_contacts WHERE is_favorite = 1", 
            fetch='one'
        )
        stats['favorite_contacts'] = favorite_contacts['count'] if favorite_contacts else 0
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"Failed to get database stats: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/background-service')
def background_service_status():
    """Get background service status and job information"""
    try:
        from services.background_service import background_service
        
        status = background_service.get_status()
        
        return jsonify({
            'success': True,
            'background_service': status
        })
        
    except Exception as e:
        logger.error(f"Failed to get background service status: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@admin_bp.route('/health')
def admin_health():
    """Admin health check endpoint"""
    try:
        # Test database connection
        health_data = db_manager.health_check()
        
        # Check background service
        from services.background_service import background_service
        bg_status = background_service.get_status()
        
        return jsonify({
            'success': True,
            'admin_status': 'healthy',
            'database': health_data,
            'background_service': bg_status
        })
        
    except Exception as e:
        logger.error(f"Admin health check failed: {e}")
        return jsonify({
            'success': False,
            'admin_status': 'unhealthy',
            'error': str(e)
        }), 500

@admin_bp.route('/sync-twilio', methods=['POST'])
def manual_sync_twilio():
    """Manually trigger Twilio call sync for testing"""
    try:
        from services.background_service import background_service
        
        if not background_service.is_running:
            return jsonify({
                'success': False,
                'error': 'Background service is not running'
            }), 400
        
        if not background_service.twilio_service:
            return jsonify({
                'success': False,
                'error': 'Twilio service is not available'
            }), 400
        
        # Manually trigger the sync
        logger.info("🔧 Manual Twilio sync triggered via admin API")
        background_service.sync_calls_with_twilio()
        
        return jsonify({
            'success': True,
            'message': 'Twilio sync completed',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Manual Twilio sync failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500