#!/usr/bin/env python3
"""
Test script to prepare data for UI testing
"""

from services.contact_service import ContactService
from services.user_service import UserService
from services.call_service import CallService

def setup_test_data():
    """Setup test data for UI demonstration"""
    
    print("🎬 Setting up test data for Contact UI demonstration")
    print("=" * 60)
    
    # Initialize services
    contact_service = ContactService()
    user_service = UserService()
    call_service = CallService()
    
    # Create demo users with friendly names
    demo_users = [
        ("ALICE", "Alice Smith"),
        ("BOB01", "Bob Johnson"), 
        ("CAROL", "Carol Wilson"),
        ("DAVE2", "Dave Brown"),
        ("EVE99", "Eve Davis"),
        ("FRANK", "Frank Miller")
    ]
    
    print("\n1️⃣ Creating demo users...")
    for username, display_name in demo_users:
        result = user_service.register_or_update_user(
            username=username,
            display_name=display_name,
            device_type='smarttv'
        )
        print(f"   ✅ {username} ({display_name})")
    
    print("\n2️⃣ Setting up contact relationships...")
    
    # ALICE's contacts
    contact_service.add_contact("ALICE", "BOB01")
    contact_service.add_contact("ALICE", "CAROL")
    contact_service.add_contact("ALICE", "DAVE2")
    contact_service.set_favorite_status("ALICE", "BOB01", True)
    print("   📞 ALICE has contacts: BOB01 (⭐), CAROL, DAVE2")
    
    # BOB01's contacts  
    contact_service.add_contact("BOB01", "ALICE")
    contact_service.add_contact("BOB01", "EVE99")
    contact_service.set_favorite_status("BOB01", "ALICE", True)
    print("   📞 BOB01 has contacts: ALICE (⭐), EVE99")
    
    # CAROL's contacts
    contact_service.add_contact("CAROL", "ALICE")
    contact_service.add_contact("CAROL", "FRANK")
    print("   📞 CAROL has contacts: ALICE, FRANK")
    
    print("\n3️⃣ Simulating online presence...")
    # Make some users appear online
    call_service.update_presence("BOB01", "online")
    call_service.update_presence("CAROL", "online")
    call_service.update_presence("EVE99", "online")
    print("   🟢 Online: BOB01, CAROL, EVE99")
    print("   ⚫ Offline: ALICE, DAVE2, FRANK")
    
    print("\n4️⃣ Contact statistics:")
    for username in ["ALICE", "BOB01", "CAROL"]:
        stats = contact_service.get_contact_stats(username)
        contacts = contact_service.get_contact_list_with_status(username)
        online_count = len([c for c in contacts if c['is_online']])
        print(f"   👤 {username}: {stats['total_contacts']} contacts, {online_count} online, {stats['favorite_contacts']} favorites")
    
    print("\n✅ Test data setup complete!")
    print("\n🎯 To test the UI:")
    print("   1. Open user-directory.html in the Electron app")
    print("   2. Try switching between tabs:")
    print("      📞 My Contacts - Shows your contacts with online status")
    print("      🔍 Add Contacts - Search for users to add")
    print("      🌐 All Online Users - Shows all online users")
    print("   3. Test contact management:")
    print("      ➕ Add contacts from search")
    print("      ⭐ Toggle favorites")
    print("      ❌ Remove contacts")
    print("      📞 Call online contacts")

if __name__ == "__main__":
    setup_test_data()