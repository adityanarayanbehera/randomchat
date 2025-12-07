"""
Script to remove all disappearing message code from frontend chat pages
This will clean FriendChatPage.jsx and GroupChatPage.jsx
"""

import re

# File paths
FRIEND_CHAT = r"c:\Users\Aditya Narayan Beher\Desktop\RANDOMCHATAPP\frontend\src\pages\FriendChatPage.jsx"
GROUP_CHAT = r"c:\Users\Aditya Narayan Beher\Desktop\RANDOMCHATAPP\frontend\src\pages\GroupChatPage.jsx"

def clean_friend_chat():
    """Remove all disappearing message code from FriendChatPage.jsx"""
    with open(FRIEND_CHAT, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Original FriendChatPage.jsx length: {len(content)} chars")
    
    # Lines to remove (based on grep results):
    # - Line 62-63: useState for disappearingEnabled, disappearingDuration
    # - Line 68: useRef for disappearingTimerRef
    # - Lines 92-93, 187-226: useEffect with disappearing timer logic
    # - Lines 262-263: setDisappearing calls in fetchChatMeta
    # - Lines 625-646: handleDisappearingMessages function
    # - Lines 847-900: UI menu for disappearing messages
    
    # Remove state declarations
    content = re.sub(
        r'  // ✅ Disappearing messages state\n  const \[disappearingEnabled.*?\n  const \[disappearingDuration.*?\n',
        '  // REMOVED: Disappearing messages - replaced with 6-day auto-delete\n',
        content,
        flags=re.DOTALL
    )
    
    # Remove ref
    content = re.sub(
        r'  const disappearingTimerRef = useRef\(null\);\n',
        '',
        content
    )
    
    # Remove useEffect cleanup blocks
    content = re.sub(
        r'  // ✅ CRITICAL: Real-time disappearing messages.*?}, \[disappearingEnabled, disappearingDuration\]\);',
        '  // REMOVED: Disappearing message timer - replaced with 6-day auto-delete',
        content,
        flags=re.DOTALL
    )
    
    # Remove setDisappearing calls
    content = re.sub(
        r'        setDisappearing.*?\(metaData\.meta\?\.disappearing.*?\);?\n        setDisappearing.*?\(metaData\.meta\?\.disappearingDuration.*?\);?\n',
        '',
        content
    )
    
    # Remove handleDisappearingMessages function
    content = re.sub(
        r'  // ✅ Disappearing messages toggle\n  const handleDisappearingMessages = async.*?  };',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Remove disappearingTimer cleanup in useEffect cleanup
    content = re.sub(
        r'      if \(disappearingTimerRef\.current\) \{\n        clearInterval\(disappearingTimerRef\.current\);\n      \}\n',
        '',
        content
    )
    
    print(f"Cleaned FriendChatPage.jsx length: {len(content)} chars")
    print("Removing UI elements manually - will continue in next steps")
    
    # Save
    with open(FRIEND_CHAT, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return True

def clean_group_chat():
    """Remove all disappearing message code from GroupChatPage.jsx"""
    with open(GROUP_CHAT, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Original GroupChatPage.jsx length: {len(content)} chars")
    
    # Remove state declarations
    content = re.sub(
        r'  const \[disappearingDuration.*?\n  const \[showDisappearing.*?\n  const \[disappearingMessagesToRemove.*?\n',
        '  // REMOVED: Disappearing messages - replaced with 6-day auto-delete\n',
        content,
        flags=re.DOTALL
    )
    
    # Remove ref
    content = re.sub(
        r'  const disappearingTimerRef = useRef\(null\);\n',
        '',
        content
    )
    
    # Remove socket handler
    content = re.sub(
        r'    const handleDisappearingUpdated = .*?};',
        '',
        content,
        flags=re.DOTALL
    )
    
    # Remove socket listeners
    content = re.sub(
        r'      "group_disappearing_updated",\n      handleDisappearingUpdated\n',
        '',
        content
    )
    
    # Remove disappearing timer useEffect
    content = re.sub(
        r'  // Disappearing messages timer\n  useEffect\(\(\) => \{.*?\}, \[disappearingDuration.*?\]\);',
        '  // REMOVED: Disappearing message timer - replaced with 6-day auto-delete',
        content,
        flags=re.DOTALL
    )
    
    # Remove cleanup
    content = re.sub(
        r'      if \(disappearingTimerRef\.current\) \{\n        clearInterval\(disappearingTimerRef\.current\);\n      \}\n',
        '',
        content
    )
    
    print(f"Cleaned GroupChatPage.jsx length: {len(content)} chars")
    
    # Save
    with open(GROUP_CHAT, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return True

if __name__ == "__main__":
    print("Starting cleanup of disappearing message code...")
    print("=" * 60)
    
    if clean_friend_chat():
        print("✅ FriendChatPage.jsx cleaned")
    else:
        print("❌ FriendChatPage.jsx cleanup failed")
    
    print("=" * 60)
    
    if clean_group_chat():
        print("✅ GroupChatPage.jsx cleaned")
    else:
        print("❌ GroupChatPage.jsx cleanup failed")
    
    print("=" * 60)
    print("Cleanup complete! Manual UI cleanup may be needed.")
