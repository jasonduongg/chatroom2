import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import DynamicChatroom from "../../components/DynamicChatroom/DynamicChatroom.tsx";

function AdminPanel({ user }) {
    const [chatrooms, setChatrooms] = useState([]);
    const [loading, setLoading] = useState(true);;
    const [activeChatroomId, setActiveChatroomId] = useState(null);
    const [activeChatroomName, setActiveChatroomName] = useState(null);
    const [inviteCodeInput, setInviteCodeInput] = useState('');

    const fetchChatrooms = async () => {
        try {
            const response = await fetch(`http://localhost:443/user/roomids?customerId=${user.id}&customerEmail=${user.email}`);
            if (response.ok) {
                const data = await response.json();
                setChatrooms(data);
            } else {
                console.error('Failed to fetch chatrooms:', response.status);
            }
        } catch (error) {
            console.error('Error fetching chatrooms:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChatrooms();
    }, [user.id]);

    const handleToggleChatroom = (roomId, roomName) => {
        if (chatrooms.some(chatroom => chatroom.roomId === roomId)) {
            setActiveChatroomId(roomId === activeChatroomId ? null : roomId);
            setActiveChatroomName(roomId === activeChatroomId ? null : roomName)
        } else {
            setActiveChatroomId(null);
            setActiveChatroomName(null);
        }
    };

    const handleLeaveRoom = async (roomId) => {
        try {
            const response = await fetch('http://localhost:443/leaveRoom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId,
                    customerId: user.id,
                    customerEmail: user.email
                })
            });
            console.log(response)
            if (response.ok) {
                fetchChatrooms()                
                if (roomId === activeChatroomId) {
                    setActiveChatroomId(null);  // Clear the active room if it's the one being left
                }
                console.log('Room left successfully');
            } else {
                const errorText = await response.text();
                console.error(`Failed to leaving room: ${errorText}`);
            }
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    };
    

    const handleAddUserToChatroom = async () => {
        try {
            // Assuming your server has an endpoint to handle this operation
            console.log(user)
            const response = await fetch('http://localhost:443/addUserToChatroom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customerId: user.id,
                    inviteCode: inviteCodeInput,
                    customerEmail: user.email
                })
            });
    
            if (response.ok) {
                const data = await response.json();
                console.log(`User added to chatroom with ID: ${data.chatroomId}`);  // Assuming server sends back the chatroom ID
                setInviteCodeInput('');  // Clear the input field after successful operation
                fetchChatrooms()
            } else {
                console.error('Failed to add user to chatroom:', await response.text());
            }
        } catch (error) {
            console.error('Error adding user to chatroom:', error);
        }
    };
    
    return (
        <div>
            <h2>Chatrooms</h2>
            <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="Enter invite code"
            />
            <button onClick={handleAddUserToChatroom}>Add to Chatroom</button>
        
            <ul>
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    chatrooms.map(chatroom => (
                        <li key={chatroom.roomId}>
                            <strong>ID:</strong> {chatroom.roomId},
                            <strong>Name:</strong> {chatroom.roomName},
                            <button onClick={() => handleLeaveRoom(chatroom.roomId)}>Leave</button>
                            <button onClick={() => handleToggleChatroom(chatroom.roomId, chatroom.roomName)}>Toggle</button>
                        </li>
                    ))
                )}
            </ul>

            <div className="active-chatroom">
                {activeChatroomId && (
                    <DynamicChatroom user={user} isLoggedIn={true} chatroomId={activeChatroomId} chatroomName={activeChatroomName} />
                    )}
            </div>
        </div>
    );
}

export default AdminPanel;
