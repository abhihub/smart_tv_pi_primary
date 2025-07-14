#!/usr/bin/env python3
"""
Local System Management Server

This Flask server runs locally on localhost:5000 and handles system operations
like shutdown and reboot for the local console/device. This prevents the remote
server from shutting itself down when these commands are executed.

This is part of the SmartTV system manager and should be installed via setup.sh
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import logging
import os
import threading
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/smarttv-local-system.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('smarttv.local_system')

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/system/shutdown', methods=['POST'])
def shutdown_system():
    """
    Shutdown the local system (console/device)
    
    Expected JSON payload:
    {
        "confirm": true,
        "delay": 0  # optional delay in seconds
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
        
        logger.info(f"⚡ Local shutdown requested from {request.remote_addr}")
        logger.info(f"🚨 Command: {' '.join(shutdown_cmd)}")
        
        # Execute shutdown in background to allow response to be sent
        def execute_shutdown():
            try:
                # Execute the actual shutdown command
                subprocess.run(shutdown_cmd, check=True)
                logger.info("💀 Local system shutdown command executed")
            except subprocess.CalledProcessError as e:
                logger.error(f"❌ Shutdown failed: {e}")
            except Exception as e:
                logger.error(f"❌ Shutdown error: {e}")
        
        # Schedule shutdown execution after response is sent
        shutdown_thread = threading.Thread(target=execute_shutdown)
        shutdown_thread.daemon = True
        shutdown_thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Local system shutdown initiated',
            'delay_seconds': delay,
            'command': ' '.join(shutdown_cmd),
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 200
        
    except Exception as e:
        logger.error(f"Shutdown request failed: {e}")
        return jsonify({
            'error': f'Shutdown failed: {str(e)}',
            'success': False
        }), 500

@app.route('/api/system/reboot', methods=['POST'])
def reboot_system():
    """
    Reboot the local system (console/device)
    
    Expected JSON payload:
    {
        "confirm": true,
        "delay": 0  # optional delay in seconds
    }
    """
    try:
        data = request.get_json() or {}
        
        # Basic confirmation check
        if not data.get('confirm', False):
            logger.warning("❌ Reboot rejected: No confirmation")
            return jsonify({
                'error': 'Reboot requires confirmation',
                'required': {'confirm': True}
            }), 400
        
        delay = data.get('delay', 0)
        
        logger.info(f"🔄 Local reboot requested from {request.remote_addr}")
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
                logger.info("🔄 Local system reboot command executed")
            except subprocess.CalledProcessError as e:
                logger.error(f"❌ Reboot command failed: {e}")
            except Exception as e:
                logger.error(f"❌ Reboot execution error: {e}")
        
        reboot_thread = threading.Thread(target=execute_reboot)
        reboot_thread.daemon = True
        reboot_thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Local system reboot initiated',
            'delay_seconds': delay,
            'command': ' '.join(reboot_cmd),
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 200
        
    except Exception as e:
        logger.error(f"Reboot request failed: {e}")
        return jsonify({
            'error': f'Reboot failed: {str(e)}',
            'success': False
        }), 500

@app.route('/api/system/status', methods=['GET'])
def system_status():
    """
    Get local system status information
    """
    try:
        # Get basic system info
        uptime = subprocess.check_output(['uptime'], text=True).strip()
        disk_usage = subprocess.check_output(['df', '-h', '/'], text=True).strip()
        memory_usage = subprocess.check_output(['free', '-h'], text=True).strip()
        
        return jsonify({
            'success': True,
            'status': 'running',
            'uptime': uptime,
            'disk_usage': disk_usage.split('\n')[1] if len(disk_usage.split('\n')) > 1 else disk_usage,
            'memory_usage': memory_usage.split('\n')[1] if len(memory_usage.split('\n')) > 1 else memory_usage,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 200
        
    except Exception as e:
        logger.error(f"Status request failed: {e}")
        return jsonify({
            'error': f'Status check failed: {str(e)}',
            'success': False
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """
    Simple health check endpoint
    """
    return jsonify({
        'status': 'healthy',
        'service': 'smarttv_local_system_server',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }), 200

if __name__ == '__main__':
    logger.info("🚀 Starting SmartTV Local System Management Server on localhost:5000")
    logger.info("📋 Available endpoints:")
    logger.info("  POST /api/system/shutdown - Shutdown local system")
    logger.info("  POST /api/system/reboot - Reboot local system")
    logger.info("  GET  /api/system/status - Get system status")
    logger.info("  GET  /health - Health check")
    
    try:
        app.run(
            host='127.0.0.1',  # Only listen on localhost
            port=5000,
            debug=False,
            threaded=True
        )
    except Exception as e:
        logger.error(f"Failed to start server: {e}")