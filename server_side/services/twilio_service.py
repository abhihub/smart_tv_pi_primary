import os
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant

class TwilioService:
    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.api_key = os.getenv('TWILIO_API_KEY')
        self.api_secret = os.getenv('TWILIO_API_SECRET')
        
        # Validate that all required environment variables are present
        if not all([self.account_sid, self.api_key, self.api_secret]):
            raise ValueError("Missing required Twilio environment variables")
    
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