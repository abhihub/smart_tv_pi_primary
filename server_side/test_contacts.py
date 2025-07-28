#!/usr/bin/env python3
"""
Test script for the contact system functionality
"""

from services.contact_service import ContactService
from services.user_service import UserService
from services.call_service import CallService

def test_contact_system():
    """Test the complete contact system functionality"""
    
    print("🧪 Testing SmartTV Contact System")
    print("=" * 50)
    
    # Initialize services
    contact_service = ContactService()
    user_service = UserService()
    call_service = CallService()
    
    # Test users
    test_users = [
        ("USER1", "Alice"),
        ("USER2", "Bob"), 
        ("USER3", "Charlie"),
        ("USER4", "Diana")
    ]
    
    print("\n1️⃣ Creating test users...")
    for username, display_name in test_users:
        result = user_service.register_or_update_user(
            username=username,
            display_name=display_name,
            device_type='smarttv'
        )
        print(f"   ✅ Created user: {username} ({display_name})")
    
    print("\n2️⃣ Adding contacts...")
    # USER1 adds USER2 and USER3 to contacts
    result1 = contact_service.add_contact("USER1", "USER2")
    print(f"   USER1 -> USER2: {result1['message']}")
    
    result2 = contact_service.add_contact("USER1", "USER3")
    print(f"   USER1 -> USER3: {result2['message']}")
    
    # USER2 adds USER1 (mutual connection)
    result3 = contact_service.add_contact("USER2", "USER1")
    print(f"   USER2 -> USER1: {result3['message']}")
    
    # USER3 adds USER4
    result4 = contact_service.add_contact("USER3", "USER4")
    print(f"   USER3 -> USER4: {result4['message']}")
    
    print("\n3️⃣ Setting favorite contacts...")
    contact_service.set_favorite_status("USER1", "USER2", True)
    print("   ⭐ USER1 marked USER2 as favorite")
    
    print("\n4️⃣ Getting contact lists...")
    user1_contacts = contact_service.get_contact_list_with_status("USER1")
    print(f"   USER1's contacts ({len(user1_contacts)}):")
    for contact in user1_contacts:
        fav_icon = "⭐" if contact['is_favorite'] else "👤"
        status_icon = "🟢" if contact['is_online'] else "⚫"
        print(f"     {fav_icon} {status_icon} {contact['username']} ({contact['display_name']})")
    
    print("\n5️⃣ Testing mutual contacts...")
    user1_mutual = contact_service.get_mutual_contacts("USER1")
    print(f"   Users who have USER1 in their contacts ({len(user1_mutual)}):")
    for contact in user1_mutual:
        print(f"     👤 {contact['username']} ({contact['display_name']})")
    
    print("\n6️⃣ Testing user search...")
    search_results = contact_service.search_users("user", limit=5, exclude_username="USER1")
    print(f"   Search for 'user' (excluding USER1): {len(search_results)} results")
    for user in search_results:
        print(f"     🔍 {user['username']} ({user['display_name']})")
    
    print("\n7️⃣ Testing contact stats...")
    user1_stats = contact_service.get_contact_stats("USER1")
    print(f"   USER1 contact stats:")
    for key, value in user1_stats.items():
        print(f"     📊 {key}: {value}")
    
    print("\n8️⃣ Testing online users with contact filtering...")
    # Simulate USER2 going online
    call_service.update_presence("USER2", "online")
    print("   📡 USER2 is now online")
    
    # Get all online users
    all_online = call_service.get_online_users(exclude_username="USER1")
    print(f"   All online users: {len(all_online)}")
    
    # Get only contact online users
    contact_online = call_service.get_online_users(exclude_username="USER1", contacts_only=True)
    print(f"   Online contacts only: {len(contact_online)}")
    for user in contact_online:
        fav_icon = "⭐" if user['is_favorite'] else "👤"
        print(f"     {fav_icon} 🟢 {user['username']} ({user['display_name']})")
    
    print("\n9️⃣ Testing contact removal...")
    success = contact_service.remove_contact("USER1", "USER3")
    print(f"   Removed USER3 from USER1's contacts: {'✅' if success else '❌'}")
    
    # Check updated contact list
    updated_contacts = contact_service.get_contact_list_with_status("USER1")
    print(f"   USER1's updated contacts: {len(updated_contacts)}")
    
    print("\n🔟 Final health check...")
    health = contact_service.get_health_status()
    print(f"   Contact system health:")
    for key, value in health.items():
        if key != 'timestamp':
            print(f"     📈 {key}: {value}")
    
    print("\n✅ Contact system test completed successfully!")
    print("=" * 50)

if __name__ == "__main__":
    test_contact_system()