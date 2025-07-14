from flask import Blueprint, request, jsonify
import logging

# Use the specific system logger
logger = logging.getLogger('smarttv.system')

system_bp = Blueprint('system', __name__)

# Note: Shutdown and reboot endpoints have been moved to the local system server
# running on localhost:5000 to prevent the remote server from shutting itself down.
# 
# The local system server handles:
# - POST /api/system/shutdown
# - POST /api/system/reboot
# - GET /api/system/status
# - GET /health

@system_bp.route('/info', methods=['GET'])
def system_info():
    """
    Get remote server system information (non-destructive operations only)
    """
    try:
        import subprocess
        from datetime import datetime
        
        # Get basic system info that doesn't affect the server
        uptime = subprocess.check_output(['uptime'], text=True).strip()
        
        return jsonify({
            'success': True,
            'server_type': 'remote',
            'uptime': uptime,
            'note': 'Shutdown/reboot operations handled by local system server',
            'local_system_server': 'http://localhost:5000',
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 200
        
    except Exception as e:
        logger.error(f"System info request failed: {e}")
        return jsonify({
            'error': f'System info failed: {str(e)}',
            'success': False
        }), 500

