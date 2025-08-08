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
import shutil
import tempfile
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

@app.route('/api/system/install-update', methods=['POST'])
def install_update():
    """
    Install a .deb package update for the SmartTV application
    
    Expected JSON payload:
    {
        "packagePath": "/path/to/package.deb",
        "confirm": true,
        "restartApp": true  # optional, defaults to true
    }
    """
    try:
        data = request.get_json() or {}
        
        # Basic confirmation check
        if not data.get('confirm', False):
            logger.warning("❌ Update installation rejected: No confirmation")
            return jsonify({
                'error': 'Update installation requires confirmation',
                'required': {'confirm': True}
            }), 400
        
        package_path = data.get('packagePath')
        if not package_path:
            return jsonify({
                'error': 'Package path is required',
                'required': {'packagePath': '/path/to/package.deb'}
            }), 400
        
        # Verify package file exists and is a .deb file
        if not os.path.exists(package_path):
            logger.error(f"❌ Package file not found: {package_path}")
            return jsonify({
                'error': f'Package file not found: {package_path}',
                'success': False
            }), 404
        
        if not package_path.endswith('.deb'):
            logger.error(f"❌ Invalid package file: {package_path}")
            return jsonify({
                'error': 'Package must be a .deb file',
                'success': False
            }), 400
        
        restart_app = data.get('restartApp', True)
        
        logger.info(f"📦 Update installation requested from {request.remote_addr}")
        logger.info(f"📁 Package: {package_path}")
        logger.info(f"🔄 Restart app after install: {restart_app}")
        
        # Install the package using dpkg
        def execute_installation():
            try:
                # First, try to install the package
                install_cmd = ['dpkg', '-i', package_path]
                logger.info(f"🔧 Executing: {' '.join(install_cmd)}")
                
                result = subprocess.run(install_cmd, 
                                      capture_output=True, 
                                      text=True, 
                                      check=False)
                
                if result.returncode != 0:
                    logger.error(f"❌ Package installation failed: {result.stderr}")
                    # Try to fix dependencies if installation failed
                    logger.info("🔧 Attempting to fix dependencies...")
                    fix_cmd = ['apt-get', 'install', '-f', '-y']
                    fix_result = subprocess.run(fix_cmd, 
                                              capture_output=True, 
                                              text=True, 
                                              check=False)
                    
                    if fix_result.returncode == 0:
                        logger.info("✅ Dependencies fixed, retrying installation...")
                        # Retry installation
                        result = subprocess.run(install_cmd, 
                                              capture_output=True, 
                                              text=True, 
                                              check=False)
                    
                    if result.returncode != 0:
                        logger.error(f"❌ Installation still failed after dependency fix: {result.stderr}")
                        return
                
                logger.info("✅ Package installation completed successfully")
                logger.info(f"📄 Installation output: {result.stdout}")
                
                # Clean up the package file
                try:
                    os.remove(package_path)
                    logger.info(f"🗑️ Cleaned up package file: {package_path}")
                except Exception as cleanup_error:
                    logger.warning(f"⚠️ Failed to clean up package file: {cleanup_error}")
                
                # Restart the SmartTV application if requested
                if restart_app:
                    logger.info("🔄 Restarting SmartTV application...")
                    try:
                        # Kill existing SmartTV processes
                        subprocess.run(['pkill', '-f', 'smart-tv-ui'], 
                                     capture_output=True, 
                                     check=False)
                        
                        # Wait a moment for processes to terminate
                        threading.Event().wait(2)
                        
                        # Start the SmartTV application
                        # Assuming it's installed as a system service or has a launch script
                        restart_cmd = ['systemctl', '--user', 'restart', 'smarttv.service']
                        restart_result = subprocess.run(restart_cmd, 
                                                      capture_output=True, 
                                                      text=True, 
                                                      check=False)
                        
                        if restart_result.returncode == 0:
                            logger.info("✅ SmartTV application restarted successfully")
                        else:
                            logger.warning(f"⚠️ Failed to restart SmartTV service: {restart_result.stderr}")
                            # Try alternative restart method
                            logger.info("🔄 Trying alternative restart method...")
                            subprocess.Popen(['smart-tv-ui'], 
                                           stdout=subprocess.DEVNULL, 
                                           stderr=subprocess.DEVNULL)
                            
                    except Exception as restart_error:
                        logger.error(f"❌ Failed to restart application: {restart_error}")
                
            except Exception as e:
                logger.error(f"❌ Installation execution error: {e}")
        
        # Execute installation in background thread
        installation_thread = threading.Thread(target=execute_installation)
        installation_thread.daemon = True
        installation_thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Update installation initiated',
            'packagePath': package_path,
            'restartApp': restart_app,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }), 200
        
    except Exception as e:
        logger.error(f"Update installation request failed: {e}")
        return jsonify({
            'error': f'Update installation failed: {str(e)}',
            'success': False
        }), 500

@app.route('/api/system/verify-package', methods=['POST'])
def verify_package():
    """
    Verify a .deb package before installation
    
    Expected JSON payload:
    {
        "packagePath": "/path/to/package.deb"
    }
    """
    try:
        data = request.get_json() or {}
        package_path = data.get('packagePath')
        
        if not package_path:
            return jsonify({
                'error': 'Package path is required'
            }), 400
        
        if not os.path.exists(package_path):
            return jsonify({
                'success': False,
                'error': 'Package file not found'
            }), 404
        
        # Get package information using dpkg
        info_cmd = ['dpkg', '--info', package_path]
        result = subprocess.run(info_cmd, 
                              capture_output=True, 
                              text=True, 
                              check=False)
        
        if result.returncode != 0:
            return jsonify({
                'success': False,
                'error': 'Invalid .deb package',
                'details': result.stderr
            }), 400
        
        # Parse package info
        package_info = {}
        for line in result.stdout.split('\n'):
            if ':' in line and line.strip():
                key, value = line.split(':', 1)
                package_info[key.strip()] = value.strip()
        
        # Get system architecture for compatibility check
        try:
            import platform
            system_arch = platform.machine()
            arch_map = {
                'x86_64': 'amd64',
                'aarch64': 'arm64',
                'armv7l': 'armhf',
                'i386': 'i386',
                'i686': 'i386'
            }
            system_arch = arch_map.get(system_arch, system_arch)
            
            package_arch = package_info.get('Architecture', 'unknown')
            is_compatible = (package_arch == 'all' or 
                           package_arch == system_arch or
                           package_arch == 'unknown')
            
            return jsonify({
                'success': True,
                'valid': True,
                'packageInfo': package_info,
                'size': os.path.getsize(package_path),
                'systemArchitecture': system_arch,
                'packageArchitecture': package_arch,
                'isCompatible': is_compatible
            }), 200
        except Exception as arch_error:
            logger.warning(f"Architecture check failed: {arch_error}")
            return jsonify({
                'success': True,
                'valid': True,
                'packageInfo': package_info,
                'size': os.path.getsize(package_path)
            }), 200
        
    except Exception as e:
        logger.error(f"Package verification failed: {e}")
        return jsonify({
            'error': f'Package verification failed: {str(e)}',
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
    logger.info("  POST /api/system/install-update - Install .deb package update")
    logger.info("  POST /api/system/verify-package - Verify .deb package")
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