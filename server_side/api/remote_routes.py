from flask import Blueprint, request
from flask_socketio import emit, join_room, leave_room
import logging

remote_bp = Blueprint('remote', __name__)
logger = logging.getLogger(__name__)

def register_socketio_events(socketio):
    """Register WebSocket events for mobile remote control"""
    
    @socketio.on('connect')
    def handle_connect():
        logger.info(f"Mobile remote connected: {request.sid}")
        emit('status', {'connected': True, 'message': 'Connected to SmartTV'})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        logger.info(f"Mobile remote disconnected: {request.sid}")
    
    @socketio.on('remote_command')
    def handle_remote_command(data):
        """Handle remote control commands from mobile app"""
        try:
            command = data.get('command')
            command_data = data.get('data', {})
            
            logger.info(f"Received remote command: {command} with data: {command_data}")
            
            # Process different command types
            if command == 'navigate':
                handle_navigation_command(command_data)
            elif command == 'select':
                handle_select_command()
            elif command == 'back':
                handle_back_command()
            elif command == 'home':
                handle_home_command()
            elif command == 'volume':
                handle_volume_command(command_data)
            elif command == 'launch_app':
                handle_app_launch_command(command_data)
            else:
                logger.warning(f"Unknown remote command: {command}")
                emit('error', {'message': f'Unknown command: {command}'})
                return
            
            # Acknowledge command received
            emit('command_ack', {
                'command': command,
                'status': 'processed',
                'timestamp': data.get('timestamp')
            })
            
            # Broadcast to TV clients (Electron app)
            socketio.emit('tv_command', {
                'type': 'remote_control',
                'command': command,
                'data': command_data
            }, room='tv_clients')
            
        except Exception as e:
            logger.error(f"Error processing remote command: {e}")
            emit('error', {'message': 'Failed to process command'})
    
    @socketio.on('join_tv')
    def handle_join_tv():
        """TV client joins to receive remote commands"""
        join_room('tv_clients')
        logger.info(f"TV client joined: {request.sid}")
        emit('status', {'joined': 'tv_clients'})
    
    @socketio.on('tv_status_update')
    def handle_tv_status_update(data):
        """TV sends status updates to mobile clients"""
        logger.info(f"TV status update: {data}")
        # Broadcast to all mobile clients
        emit('tv_status', data, broadcast=True, include_self=False)


def handle_navigation_command(data):
    """Process navigation commands (up, down, left, right)"""
    direction = data.get('direction')
    logger.info(f"Navigation: {direction}")
    
    # TV-specific navigation logic would go here
    # For now, just log the command


def handle_select_command():
    """Process select/enter command"""
    logger.info("Select command received")
    
    # TV-specific select logic would go here


def handle_back_command():
    """Process back/escape command"""
    logger.info("Back command received")
    
    # TV-specific back logic would go here


def handle_home_command():
    """Process home command"""
    logger.info("Home command received")
    
    # TV-specific home logic would go here


def handle_volume_command(data):
    """Process volume commands (up, down, mute)"""
    action = data.get('action')
    logger.info(f"Volume: {action}")
    
    # TV-specific volume logic would go here
    # Could integrate with system audio controls


def handle_app_launch_command(data):
    """Process app launch command"""
    app_name = data.get('app')
    logger.info(f"Launch app: {app_name}")
    
    # TV-specific app launch logic would go here
    # Could send command to Electron main process