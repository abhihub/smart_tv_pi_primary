#!/usr/bin/env python3
"""
Device ID Management Utility

Generates and manages unique device IDs for SmartTV installations.
The device ID is stored in /etc/smarttv/device_id as a read-only file.
"""

import os
import uuid
import logging
import subprocess
from datetime import datetime

logger = logging.getLogger('smarttv.device_id')

SMARTTV_CONFIG_DIR = '/etc/smarttv'
DEVICE_ID_FILE = os.path.join(SMARTTV_CONFIG_DIR, 'device_id')
DEVICE_INFO_FILE = os.path.join(SMARTTV_CONFIG_DIR, 'device_info.json')

def generate_device_id():
    """Generate a unique device ID using UUID4"""
    return str(uuid.uuid4())

def get_system_info():
    """Get basic system information for device registration"""
    try:
        # Get hostname
        hostname = subprocess.check_output(['hostname'], text=True).strip()
        
        # Get MAC address of first network interface
        mac_address = None
        try:
            # Try to get MAC from ip command
            result = subprocess.check_output(['ip', 'link', 'show'], text=True)
            for line in result.split('\n'):
                if 'link/ether' in line and 'lo:' not in line:
                    parts = line.strip().split()
                    if len(parts) >= 2:
                        mac_address = parts[1]
                        break
        except:
            pass
        
        # Get OS info
        os_info = "Unknown"
        try:
            with open('/etc/os-release', 'r') as f:
                for line in f:
                    if line.startswith('PRETTY_NAME='):
                        os_info = line.split('=', 1)[1].strip().strip('"')
                        break
        except:
            pass
        
        return {
            'hostname': hostname,
            'mac_address': mac_address,
            'os_info': os_info,
            'generated_at': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get system info: {e}")
        return {
            'hostname': 'unknown',
            'mac_address': None,
            'os_info': 'Unknown',
            'generated_at': datetime.now().isoformat()
        }

def create_device_id():
    """Create device ID and store it in /etc/smarttv/device_id as read-only"""
    try:
        # Create /etc/smarttv directory if it doesn't exist
        os.makedirs(SMARTTV_CONFIG_DIR, mode=0o755, exist_ok=True)
        
        # Generate new device ID
        device_id = generate_device_id()
        logger.info(f"Generated new device ID: {device_id}")
        
        # Write device ID to file
        with open(DEVICE_ID_FILE, 'w') as f:
            f.write(device_id)
        
        # Make file read-only (444 permissions)
        os.chmod(DEVICE_ID_FILE, 0o444)
        
        # Also create device info file with system details
        import json
        system_info = get_system_info()
        system_info['device_id'] = device_id
        
        with open(DEVICE_INFO_FILE, 'w') as f:
            json.dump(system_info, f, indent=2)
        
        # Make device info file read-only too
        os.chmod(DEVICE_INFO_FILE, 0o444)
        
        logger.info(f"Device ID stored in {DEVICE_ID_FILE}")
        logger.info(f"Device info stored in {DEVICE_INFO_FILE}")
        
        return device_id
        
    except Exception as e:
        logger.error(f"Failed to create device ID: {e}")
        raise

def read_device_id():
    """Read existing device ID from /etc/smarttv/device_id"""
    try:
        if os.path.exists(DEVICE_ID_FILE):
            with open(DEVICE_ID_FILE, 'r') as f:
                device_id = f.read().strip()
                logger.info(f"Read existing device ID: {device_id}")
                return device_id
        else:
            logger.info("No existing device ID found")
            return None
    except Exception as e:
        logger.error(f"Failed to read device ID: {e}")
        return None

def ensure_device_id():
    """Ensure device ID exists, create if it doesn't"""
    device_id = read_device_id()
    if device_id:
        return device_id
    else:
        logger.info("Creating new device ID...")
        return create_device_id()

def get_device_info():
    """Get complete device information including ID and system details"""
    try:
        if os.path.exists(DEVICE_INFO_FILE):
            import json
            with open(DEVICE_INFO_FILE, 'r') as f:
                return json.load(f)
        else:
            # Fallback: just return device ID if info file doesn't exist
            device_id = read_device_id()
            if device_id:
                return {'device_id': device_id}
            return None
    except Exception as e:
        logger.error(f"Failed to read device info: {e}")
        return None

def validate_device_id(device_id):
    """Validate that a device ID is a valid UUID"""
    try:
        uuid.UUID(device_id)
        return True
    except ValueError:
        return False

if __name__ == '__main__':
    # Command line interface for testing
    import sys
    import argparse
    
    logging.basicConfig(level=logging.INFO)
    
    parser = argparse.ArgumentParser(description='SmartTV Device ID Management')
    parser.add_argument('--create', action='store_true', help='Create new device ID (overwrites existing)')
    parser.add_argument('--read', action='store_true', help='Read existing device ID')
    parser.add_argument('--ensure', action='store_true', help='Ensure device ID exists')
    parser.add_argument('--info', action='store_true', help='Show device information')
    
    args = parser.parse_args()
    
    if args.create:
        device_id = create_device_id()
        print(f"Created device ID: {device_id}")
    elif args.read:
        device_id = read_device_id()
        if device_id:
            print(f"Device ID: {device_id}")
        else:
            print("No device ID found")
            sys.exit(1)
    elif args.ensure:
        device_id = ensure_device_id()
        print(f"Device ID: {device_id}")
    elif args.info:
        info = get_device_info()
        if info:
            import json
            print(json.dumps(info, indent=2))
        else:
            print("No device information found")
            sys.exit(1)
    else:
        parser.print_help()