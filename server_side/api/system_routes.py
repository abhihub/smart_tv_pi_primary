from flask import Blueprint, request, jsonify
import subprocess
import logging
import os
from datetime import datetime

# Use the specific system logger
logger = logging.getLogger('smarttv.system')

system_bp = Blueprint('system', __name__)

@system_bp.route('/shutdown', methods=['POST'])
def shutdown_system():
    """
    Shutdown the Raspberry Pi system
    
    This endpoint will:
    1. Gracefully close the Flask server
    2. Shutdown the Raspberry Pi system
    
    Expected JSON payload (optional):
    {
        "confirm": true,
        "delay": 0
    }
    """
    try:
        data = request.get_json() or {}
        
        # Basic confirmation check
        if not data.get('confirm', False):
            logger.warning("❌ Shutdown rejected: No confirmation")
            return jsonify({
                'error': 'Shutdown requires confirmation',
                'required': {'confirm': True}
            }), 400
        
        # Optional delay parameter (seconds)
        delay = data.get('delay', 0)
        
        # Prepare shutdown command
        if delay > 0:
            shutdown_cmd = ['sudo', 'shutdown', '-h', f'+{delay//60}'] if delay >= 60 else ['sudo', 'shutdown', '-h', f'+1']
        else:
            shutdown_cmd = ['sudo', 'shutdown', '-h', 'now']
        
        logger.info(f"⚡ Shutdown requested from {request.remote_addr}")
        logger.info(f"🚨 Command: {' '.join(shutdown_cmd)} (TEST MODE - not executed)")
        
        # Execute shutdown in background to allow response to be sent
        def execute_shutdown():
            try:
                # UNCOMMENT THIS LINE TO ENABLE REAL SHUTDOWN:
                # subprocess.run(shutdown_cmd, check=True)
                logger.info("💀 [TEST] Shutdown command would execute here")
            except subprocess.CalledProcessError as e:
                logger.error(f"❌ Shutdown failed: {e}")
            except Exception as e:
                logger.error(f"❌ Shutdown error: {e}")
        
        # Schedule shutdown execution after response is sent
        import threading
        shutdown_thread = threading.Thread(target=execute_shutdown)
        shutdown_thread.daemon = True
        shutdown_thread.start()
        
        return jsonify({
            'success': True,
            'message': 'System shutdown initiated',
            'delay_seconds': delay,
            'command': ' '.join(shutdown_cmd),
            'test_mode': True,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 200
        
    except Exception as e:
        logger.error(f"Shutdown request failed: {e}")
        return jsonify({
            'error': f'Shutdown failed: {str(e)}',
            'success': False
        }), 500

@system_bp.route('/reboot', methods=['POST'])
def reboot_system():
    """
    Reboot the Raspberry Pi system
    
    Expected JSON payload (optional):
    {
        "confirm": true,
        "delay": 0
    }
    """
    try:
        data = request.get_json() or {}
        
        # Basic confirmation check
        if not data.get('confirm', False):
            return jsonify({
                'error': 'Reboot requires confirmation',
                'required': {'confirm': True}
            }), 400
        
        delay = data.get('delay', 0)
        
        logger.info(f"=== SYSTEM REBOOT INITIATED ===")
        logger.info(f"Reboot delay: {delay} seconds")
        
        # Prepare reboot command
        if delay > 0:
            reboot_cmd = ['sudo', 'shutdown', '-r', f'+{delay//60}'] if delay >= 60 else ['sudo', 'shutdown', '-r', f'+1']
        else:
            reboot_cmd = ['sudo', 'reboot']
        
        logger.info(f"Executing reboot command: {' '.join(reboot_cmd)}")
        
        # Execute reboot in background
        def execute_reboot():
            try:
                subprocess.run(reboot_cmd, check=True)
            except subprocess.CalledProcessError as e:
                logger.error(f"Reboot command failed: {e}")
            except Exception as e:
                logger.error(f"Reboot execution error: {e}")
        
        import threading
        reboot_thread = threading.Thread(target=execute_reboot)
        reboot_thread.daemon = True
        reboot_thread.start()
        
        return jsonify({
            'success': True,
            'message': 'System reboot initiated',
            'delay_seconds': delay,
            'timestamp': subprocess.check_output(['date'], text=True).strip()
        }), 200
        
    except Exception as e:
        logger.error(f"Reboot request failed: {e}")
        return jsonify({
            'error': f'Reboot failed: {str(e)}',
            'success': False
        }), 500

