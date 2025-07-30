import os
import logging
from typing import Dict, Any, List
from twilio.rest import Client
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant

logger = logging.getLogger(__name__)

class TwilioService:
    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.api_key = os.getenv('TWILIO_API_KEY')
        self.api_secret = os.getenv('TWILIO_API_SECRET')
        
        # Validate that all required environment variables are present
        if not all([self.account_sid, self.api_key, self.api_secret]):
            raise ValueError("Missing required Twilio environment variables")
        
        # Initialize Twilio REST client for room monitoring
        self.client = Client(self.api_key, self.api_secret, self.account_sid)
    
    def generate_access_token(self, identity, room_name, ttl=3600):
        """
        Generate a Twilio access token for video calling
        
        Args:
            identity (str): User identifier
            room_name (str): Name of the video room
            ttl (int): Token time-to-live in seconds (default: 1 hour)
            
        Returns:
            str: JWT access token
        """
        # Create video grant
        video_grant = VideoGrant(room=room_name)
        
        # Create access token
        token = AccessToken(
            self.account_sid,
            self.api_key,
            self.api_secret,
            identity=identity,
            ttl=ttl
        )
        
        # Add the video grant to the token
        token.add_grant(video_grant)
        
        # Return the JWT token
        return token.to_jwt()
    
    def validate_credentials(self):
        """
        Validate that Twilio credentials are properly configured
        
        Returns:
            bool: True if credentials are valid, False otherwise
        """
        return all([self.account_sid, self.api_key, self.api_secret])
    
    def get_room_status(self, room_name: str) -> Dict[str, Any]:
        """
        Get current status of a Twilio room and its participants
        
        Args:
            room_name (str): Name of the room to check
            
        Returns:
            dict: Room status information including participants
        """
        try:
            # Find room by unique name
            rooms = self.client.video.rooms.list(unique_name=room_name, limit=1)
            
            if not rooms:
                logger.debug(f"Room not found: {room_name}")
                return {
                    'exists': False, 
                    'status': None, 
                    'participants': [],
                    'participant_count': 0
                }
            
            room = rooms[0]
            logger.debug(f"Found room {room_name}: status={room.status}, sid={room.sid}")
            
            # Get participants in the room
            participants = self.client.video.rooms(room.sid).participants.list()
            
            # Filter for connected participants only
            connected_participants = []
            for participant in participants:
                if participant.status == 'connected':
                    connected_participants.append({
                        'identity': participant.identity,
                        'sid': participant.sid,
                        'connected_at': participant.date_created.isoformat() if participant.date_created else None,
                        'status': participant.status
                    })
            
            result = {
                'exists': True,
                'status': room.status,  # in-progress, completed, failed
                'sid': room.sid,
                'unique_name': room.unique_name,
                'participants': connected_participants,
                'participant_count': len(connected_participants),
                'room_created_at': room.date_created.isoformat() if room.date_created else None,
                'room_ended_at': room.end_time.isoformat() if room.end_time else None
            }
            
            logger.debug(f"Room {room_name} status: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to get room status for {room_name}: {e}")
            return {
                'exists': False, 
                'error': str(e),
                'participants': [],
                'participant_count': 0
            }
    
    def list_active_rooms(self) -> List[Dict[str, Any]]:
        """
        List all currently active (in-progress) rooms
        
        Returns:
            list: List of active rooms with basic info
        """
        try:
            # Get rooms with in-progress status
            rooms = self.client.video.rooms.list(status='in-progress')
            
            active_rooms = []
            for room in rooms:
                active_rooms.append({
                    'sid': room.sid,
                    'unique_name': room.unique_name,
                    'status': room.status,
                    'created_at': room.date_created.isoformat() if room.date_created else None
                })
            
            logger.debug(f"Found {len(active_rooms)} active Twilio rooms")
            return active_rooms
            
        except Exception as e:
            logger.error(f"Failed to list active rooms: {e}")
            return []
    
    def is_room_empty(self, room_name: str) -> bool:
        """
        Check if a room exists but has no connected participants
        
        Args:
            room_name (str): Name of the room to check
            
        Returns:
            bool: True if room exists but is empty, False otherwise
        """
        room_status = self.get_room_status(room_name)
        return room_status['exists'] and room_status['participant_count'] == 0