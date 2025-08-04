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
import urllib.request
import urllib.parse
import json
import time
from datetime import datetime
from device_id import ensure_device_id, get_device_info

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
            logger.warning("Shutdown rejected: No confirmation")
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
        
        logger.info(f"Local shutdown requested from {request.remote_addr}")
        logger.info(f"Executing command: {' '.join(shutdown_cmd)}")
        
        # Execute shutdown in background to allow response to be sent
        def execute_shutdown():
            try:
                # Execute the actual shutdown command
                subprocess.run(shutdown_cmd, check=True)
                logger.info("Local system shutdown command executed")
            except subprocess.CalledProcessError as e:
                logger.error(f"Shutdown failed: {e}")
            except Exception as e:
                logger.error(f"Shutdown error: {e}")
        
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
            logger.warning("Reboot rejected: No confirmation")
            return jsonify({
                'error': 'Reboot requires confirmation',
                'required': {'confirm': True}
            }), 400
        
        delay = data.get('delay', 0)
        
        logger.info(f"Local reboot requested from {request.remote_addr}")
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
                logger.info("Local system reboot command executed")
            except subprocess.CalledProcessError as e:
                logger.error(f"Reboot command failed: {e}")
            except Exception as e:
                logger.error(f"Reboot execution error: {e}")
        
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
            logger.error(f"Package file not found: {package_path}")
            return jsonify({
                'error': f'Package file not found: {package_path}',
                'success': False
            }), 404
        
        if not package_path.endswith('.deb'):
            logger.error(f"Invalid package file: {package_path}")
            return jsonify({
                'error': 'Package must be a .deb file',
                'success': False
            }), 400
        
        restart_app = data.get('restartApp', True)
        
        logger.info(f"Update installation requested from {request.remote_addr}")
        logger.info(f"Package: {package_path}")
        logger.info(f"Restart app after install: {restart_app}")
        
        # Install the package using dpkg with uninstall-first approach
        def execute_installation():
            try:
                # First, get package name from the .deb file to identify what to uninstall
                info_cmd = ['dpkg', '--info', package_path]
                info_result = subprocess.run(info_cmd, 
                                           capture_output=True, 
                                           text=True, 
                                           check=False)
                
                package_name = None
                if info_result.returncode == 0:
                    # Parse package name from dpkg --info output
                    for line in info_result.stdout.split('\n'):
                        if line.strip().startswith('Package:'):
                            package_name = line.split(':', 1)[1].strip()
                            break
                
                if package_name:
                    logger.info(f"Identified package name: {package_name}")
                    
                    # Check if package is currently installed
                    check_cmd = ['dpkg', '-l', package_name]
                    check_result = subprocess.run(check_cmd, 
                                                capture_output=True, 
                                                text=True, 
                                                check=False)
                    
                    if check_result.returncode == 0 and package_name in check_result.stdout:
                        logger.info(f"Uninstalling existing package: {package_name}")
                        uninstall_cmd = ['dpkg', '--remove', package_name]
                        logger.info(f"Executing: {' '.join(uninstall_cmd)}")
                        
                        uninstall_result = subprocess.run(uninstall_cmd, 
                                                        capture_output=True, 
                                                        text=True, 
                                                        check=False)
                        
                        if uninstall_result.returncode == 0:
                            logger.info("✅ Existing package uninstalled successfully")
                        else:
                            logger.warning(f"⚠️ Uninstall failed, proceeding anyway: {uninstall_result.stderr}")
                    else:
                        logger.info(f"ℹ️ Package {package_name} not currently installed")
                else:
                    logger.warning("⚠️ Could not determine package name, proceeding with direct installation")
                
                # Now install the new package
                install_cmd = ['dpkg', '-i', package_path]
                logger.info(f"Installing new package: {' '.join(install_cmd)}")
                
                result = subprocess.run(install_cmd, 
                                      capture_output=True, 
                                      text=True, 
                                      check=False)
                
                if result.returncode != 0:
                    logger.error(f"Package installation failed: {result.stderr}")
                    # Try to fix dependencies if installation failed
                    logger.info("Attempting to fix dependencies...")
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
                        logger.error(f"Installation still failed after dependency fix: {result.stderr}")
                        return
                
                logger.info("Package installation completed successfully")
                logger.info(f"Installation output: {result.stdout}")
                
                # Ensure device ID exists after successful installation
                try:
                    device_id = ensure_device_id()
                    logger.info(f"Device ID ensured: {device_id}")
                except Exception as device_error:
                    logger.error(f"Failed to ensure device ID: {device_error}")
                
                # Clean up the package file
                try:
                    os.remove(package_path)
                    logger.info(f"Cleaned up package file: {package_path}")
                except Exception as cleanup_error:
                    logger.warning(f"Failed to clean up package file: {cleanup_error}")
                
                # Restart the SmartTV application if requested
                if restart_app:
                    logger.info("Restarting SmartTV application...")
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
                            logger.info("SmartTV application restarted successfully")
                        else:
                            logger.warning(f"Failed to restart SmartTV service: {restart_result.stderr}")
                            # Try alternative restart method
                            logger.info("Trying alternative restart method...")
                            subprocess.Popen(['smart-tv-ui'], 
                                           stdout=subprocess.DEVNULL, 
                                           stderr=subprocess.DEVNULL)
                            
                    except Exception as restart_error:
                        logger.error(f"Failed to restart application: {restart_error}")
                
            except Exception as e:
                logger.error(f"Installation execution error: {e}")
        
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

@app.route('/api/system/device-info', methods=['GET'])
def get_device_information():
    """
    Get device ID and system information
    """
    try:
        device_info = get_device_info()
        if device_info:
            return jsonify({
                'success': True,
                'deviceInfo': device_info,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'No device information available',
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }), 404
    except Exception as e:
        logger.error(f"Device info request failed: {e}")
        return jsonify({
            'error': f'Device info request failed: {str(e)}',
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

# DISABLED: Boot update installation
# def check_for_downloaded_updates():
#     """
#     Check for previously downloaded updates and install them on boot
#     """
#     logger.info("Checking for downloaded updates on boot...")
#     
#     try:
#         update_marker_file = os.path.expanduser('~/.smarttv-update-ready')
#         
#         if os.path.exists(update_marker_file):
#             logger.info("Found downloaded update marker file")
#             
#             # Read the update file path
#             with open(update_marker_file, 'r') as f:
#                 update_file_path = f.read().strip()
#             
#             if os.path.exists(update_file_path):
#                 logger.info(f"Found downloaded update file: {update_file_path}")
#                 
#                 # Install the update
#                 logger.info("Installing downloaded update on boot...")
#                 install_success = install_update_package(update_file_path, False)
#                 
#                 if install_success:
#                     logger.info("✅ Boot update installation completed successfully")
#                     
#                     # Clean up the marker file and update file
#                     try:
#                         os.remove(update_marker_file)
#                         logger.info("Update marker file cleaned up")
#                     except Exception as e:
#                         logger.warning(f"Failed to clean up marker file: {e}")
#                 else:
#                     logger.error("❌ Boot update installation failed")
#             else:
#                 logger.warning(f"Update file not found: {update_file_path}")
#                 # Clean up the stale marker file
#                 try:
#                     os.remove(update_marker_file)
#                     logger.info("Stale marker file cleaned up")
#                 except Exception as e:
#                     logger.warning(f"Failed to clean up stale marker file: {e}")
#         else:
#             logger.info("No downloaded updates found")
#     
#     except Exception as e:
#         logger.error(f"Error checking for downloaded updates: {e}")

# DISABLED: Force update checking on startup  
# def check_for_force_updates():
#     """
#     Check for force updates on startup and install them automatically
#     """
#     logger.info("Checking for force updates on startup...")
#     
#     try:
#         # Configuration - could be moved to env vars or config file
#         SERVER_URL = os.environ.get('SERVER_URL', 'http://100.124.6.99:3001')
#         CURRENT_VERSION = "1.0.0"  # Default fallback version
#         
#         # Try to get current version from /etc/smarttv/version file
#         try:
#             with open('/etc/smarttv/version', 'r') as f:
#                 CURRENT_VERSION = f.read().strip()
#                 logger.info(f"Version read from /etc/smarttv/version: {CURRENT_VERSION}")
#         except FileNotFoundError:
#             logger.warning("Version file /etc/smarttv/version not found, using default")
#         except Exception as e:
#             logger.warning(f"Could not read version from /etc/smarttv/version: {e}")
#             
#             # Fallback: Try to get current version from installed package
#             try:
#                 result = subprocess.run(['dpkg', '-l', 'smart-tv-ui'], 
#                                       capture_output=True, text=True, check=False)
#                 if result.returncode == 0:
#                     for line in result.stdout.split('\n'):
#                         if 'smart-tv-ui' in line:
#                             parts = line.split()
#                             if len(parts) >= 3:
#                                 CURRENT_VERSION = parts[2]
#                                 logger.info(f"Version fallback from dpkg: {CURRENT_VERSION}")
#                                 break
#             except Exception as dpkg_error:
#                 logger.warning(f"Could not determine current version from dpkg: {dpkg_error}")
#         
#         logger.info(f"Current version: {CURRENT_VERSION}")
#         logger.info(f"Checking updates from: {SERVER_URL}")
#         
#         # Make HTTP request to check for updates
#         url = f"{SERVER_URL}/api/updates/check?version={urllib.parse.quote(CURRENT_VERSION)}"
#         
#         try:
#             with urllib.request.urlopen(url, timeout=30) as response:
#                 if response.status != 200:
#                     logger.error(f"Update check failed with status: {response.status}")
#                     return
#                 
#                 data = json.loads(response.read().decode('utf-8'))
#                 logger.info(f"Update check result: {data}")
#                 
#                 # Check if force update is enabled or update is marked as important
#                 if data.get('hasUpdate') and (data.get('forceUpdate') or data.get('important')):
#                     logger.info("Force update or important update detected!")
#                     logger.info(f"Current: {data.get('currentVersion')}, Latest: {data.get('latestVersion')}")
#                     logger.info(f"Important: {data.get('important')}, Force: {data.get('forceUpdate')}")
#                     
#                     # Download the update
#                     download_url = f"{SERVER_URL}{data.get('downloadUrl')}"
#                     logger.info(f"Auto-downloading update from: {download_url}")
#                     
#                     # Create downloads directory if it doesn't exist
#                     downloads_dir = '/tmp/smarttv-updates'
#                     os.makedirs(downloads_dir, exist_ok=True)
#                     
#                     filename = f"smart-tv-ui_{data.get('latestVersion')}_amd64.deb"
#                     download_path = os.path.join(downloads_dir, filename)
#                     
#                     # Download the file
#                     with urllib.request.urlopen(download_url, timeout=300) as download_response:
#                         if download_response.status != 200:
#                             logger.error(f"Download failed with status: {download_response.status}")
#                             return
#                         
#                         with open(download_path, 'wb') as f:
#                             shutil.copyfileobj(download_response, f)
#                         
#                         logger.info(f"Update downloaded to: {download_path}")
#                     
#                     # Verify the package
#                     logger.info("Verifying downloaded package...")
#                     verify_cmd = ['dpkg', '--info', download_path]
#                     verify_result = subprocess.run(verify_cmd, capture_output=True, text=True, check=False)
#                     
#                     if verify_result.returncode != 0:
#                         logger.error(f"Package verification failed: {verify_result.stderr}")
#                         try:
#                             os.remove(download_path)
#                         except:
#                             pass
#                         return
#                     
#                     logger.info("Package verified successfully")
#                     
#                     # Install the update
#                     logger.info("Installing force update...")
#                     install_success = install_update_package(download_path, data.get('important', False))
#                     
#                     if install_success:
#                         logger.info("Force update installed successfully")
#                         
#                         # If marked as important, trigger reboot after installation
#                         if data.get('important'):
#                             logger.info("Important update - system will reboot in 10 seconds...")
#                             time.sleep(10)  # Give some time for processes to clean up
#                             subprocess.run(['sudo', 'reboot'], check=False)
#                     else:
#                         logger.error("Force update installation failed")
#                 
#                 elif data.get('hasUpdate'):
#                     logger.info("Regular update available, no force action required")
#                 else:
#                     logger.info("No updates available")
#         
#         except urllib.error.URLError as e:
#             logger.error(f"Network error during update check: {e}")
#         except json.JSONDecodeError as e:
#             logger.error(f"Invalid JSON response: {e}")
#         except Exception as e:
#             logger.error(f"Unexpected error during update check: {e}")
#             
#     except Exception as e:
#         logger.error(f"Force update check failed: {e}")


def install_update_package(package_path, is_important=False):
    """
    Install a .deb package update
    Returns True if successful, False otherwise
    """
    try:
        logger.info(f"Installing package: {package_path}")
        
        # Get package name from the .deb file
        info_cmd = ['dpkg', '--info', package_path]
        info_result = subprocess.run(info_cmd, capture_output=True, text=True, check=False)
        
        package_name = None
        if info_result.returncode == 0:
            for line in info_result.stdout.split('\n'):
                if line.strip().startswith('Package:'):
                    package_name = line.split(':', 1)[1].strip()
                    break
        
        if package_name:
            logger.info(f"Package name: {package_name}")
            
            # Check if package is currently installed and uninstall it
            check_cmd = ['dpkg', '-l', package_name]
            check_result = subprocess.run(check_cmd, capture_output=True, text=True, check=False)
            
            if check_result.returncode == 0 and package_name in check_result.stdout:
                logger.info(f"Uninstalling existing package: {package_name}")
                uninstall_cmd = ['dpkg', '--remove', package_name]
                uninstall_result = subprocess.run(uninstall_cmd, capture_output=True, text=True, check=False)
                
                if uninstall_result.returncode == 0:
                    logger.info("Existing package uninstalled")
                else:
                    logger.warning(f"Uninstall warning: {uninstall_result.stderr}")
        
        # Install the new package
        install_cmd = ['dpkg', '-i', package_path]
        logger.info(f"Installing: {' '.join(install_cmd)}")
        
        result = subprocess.run(install_cmd, capture_output=True, text=True, check=False)
        
        if result.returncode != 0:
            logger.warning(f"Initial install failed, trying dependency fix: {result.stderr}")
            
            # Try to fix dependencies
            fix_cmd = ['apt-get', 'install', '-f', '-y']
            fix_result = subprocess.run(fix_cmd, capture_output=True, text=True, check=False)
            
            if fix_result.returncode == 0:
                logger.info("Dependencies fixed, retrying installation...")
                result = subprocess.run(install_cmd, capture_output=True, text=True, check=False)
        
        if result.returncode == 0:
            logger.info("Package installation completed successfully")
            
            # Ensure device ID exists after installation
            try:
                device_id = ensure_device_id()
                logger.info(f"Device ID ensured: {device_id}")
            except Exception as e:
                logger.warning(f"Device ID ensure failed: {e}")
            
            # Clean up the package file
            try:
                os.remove(package_path)
                logger.info(f"Cleaned up package file")
            except Exception as e:
                logger.warning(f"Cleanup failed: {e}")
            
            return True
        else:
            logger.error(f"Package installation failed: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"Install package error: {e}")
        return False

if __name__ == '__main__':
    logger.info("Starting SmartTV Local System Management Server on localhost:5000")
    
    # Force update system and boot update installation disabled
    # Updates now handled manually through settings page
    logger.info("Force update system disabled - updates handled manually")
    
    # Check for updates on startup (run in background thread) - DISABLED
    # def startup_update_check():
    #     time.sleep(5)  # Wait a few seconds for system to stabilize
    #     
    #     # First check for downloaded updates from previous shutdown
    #     check_for_downloaded_updates()
    #     
    #     # Then check for force updates from server
    #     check_for_force_updates()
    # 
    # update_thread = threading.Thread(target=startup_update_check)
    # update_thread.daemon = True
    # update_thread.start()
    
    logger.info("Available endpoints:")
    logger.info("  POST /api/system/shutdown - Shutdown local system")
    logger.info("  POST /api/system/reboot - Reboot local system")
    logger.info("  POST /api/system/install-update - Install .deb package update")
    logger.info("  POST /api/system/verify-package - Verify .deb package")
    logger.info("  GET  /api/system/status - Get system status")
    logger.info("  GET  /api/system/device-info - Get device ID and information")
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