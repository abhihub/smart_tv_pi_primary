from flask import Blueprint, jsonify
import sys
import os
import logging

# Add the parent directory to Python path to import device_id module
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'system_manager'))

try:
    from device_id import ensure_device_id, get_device_info
    DEVICE_MODULE_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Device ID module not available: {e}")
    DEVICE_MODULE_AVAILABLE = False

logger = logging.getLogger(__name__)

system_bp = Blueprint('system', __name__)

@system_bp.route('/device-id', methods=['GET'])
def get_device_id():
    """Get the system device ID"""
    try:
        if not DEVICE_MODULE_AVAILABLE:
            return jsonify({
                'success': False,
                'error': 'Device ID module not available'
            }), 500
        
        # Get device ID using the system manager utility
        device_id = ensure_device_id()
        
        if device_id:
            return jsonify({
                'success': True,
                'device_id': device_id
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to get device ID'
            }), 500
            
    except Exception as e:
        logger.error(f"Failed to get device ID: {e}")
        return jsonify({
            'success': False,
            'error': f'Device ID retrieval failed: {str(e)}'
        }), 500

@system_bp.route('/device-info', methods=['GET'])
def get_device_info_endpoint():
    """Get complete device information"""
    try:
        if not DEVICE_MODULE_AVAILABLE:
            return jsonify({
                'success': False,
                'error': 'Device ID module not available'
            }), 500
        
        # Get device info using the system manager utility
        device_info = get_device_info()
        
        if device_info:
            return jsonify({
                'success': True,
                'device_info': device_info
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to get device information'
            }), 500
            
    except Exception as e:
        logger.error(f"Failed to get device info: {e}")
        return jsonify({
            'success': False,
            'error': f'Device info retrieval failed: {str(e)}'
        }), 500

@system_bp.route('/health', methods=['GET'])
def system_health():
    """Health check for system service"""
    try:
        return jsonify({
            'service': 'system_management',
            'status': 'healthy',
            'device_module_available': DEVICE_MODULE_AVAILABLE
        }), 200
        
    except Exception as e:
        logger.error(f"System health check failed: {e}")
        return jsonify({
            'service': 'system_management',
            'status': 'unhealthy',
            'error': str(e)
        }), 500