import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import DynamicChatroom from "../../components/DynamicChatroom/DynamicChatroom.tsx";

function AdminPanel({ user }) {
    const [chatrooms, setChatrooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newRoomName, setNewRoomName] = useState('');
    const [activeChatroomName, setActiveChatroomName] = useState(null);
    const [activeChatroomId, setActiveChatroomId] = useState(null); // State to track the active chatroom
    const lastToggleTime = useRef(0);

    const fetchChatrooms = async () => {
        try {
            const response = await fetch(`http://localhost:443/admin/roomids?customerId=${user.id}&customerEmail=${user.email}`);
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

    const handleDeleteRoom = async (roomId) => {
        try {
            const response = await fetch('http://localhost:443/deleteRoom', {
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

            if (response.ok) {
                fetchChatrooms();
                console.log('Room deleted successfully');
                if (roomId === activeChatroomId) {
                    setActiveChatroomId(null)
                }
            } else {
                const errorText = await response.text();
                console.error(`Failed to delete room: ${errorText}`);
            }
        } catch (error) {
            console.error('Error deleting room:', error);
        }
    };

    const handleCreateRoom = async () => {
        try {
            const roomId = uuidv4();
            const inviteCode = uuidv4().slice(0,6);
            const response = await fetch('http://localhost:443/createRoom', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId,
                    inviteCode,
                    customerId: user.id,
                    customerEmail: user.email,
                    roomName: newRoomName
                })
            });

            if (response.ok) {
                fetchChatrooms();
                console.log('Room created successfully');
                setNewRoomName("")
            } else {
                const errorText = await response.text();
                console.error(`Failed to create room: ${errorText}`);
            }
        } catch (error) {
            console.error('Error creating room:', error);
        }
    };

    const handleToggleChatroom = (roomId, roomName) => {
        const currentTime = new Date().getTime();
        if (currentTime - lastToggleTime.current < 200) {
            console.log("Toggle too frequently.");
            return;
        }

        lastToggleTime.current = currentTime; // Update last toggle time

        if (chatrooms.some(chatroom => chatroom.roomId === roomId)) {
            setActiveChatroomId(roomId === activeChatroomId ? null : roomId);
            setActiveChatroomName(roomId === activeChatroomId ? null : roomName);
        } else {
            setActiveChatroomId(null);
            setActiveChatroomName(null);
        }
    };

    return (
        <div>
            <div className='flex flex-row justify-center align-center'>
                <div className='bg-gray-200 w-min'>
                    <h1 className='pl-2 text-3xl'> Rooms </h1>
                    <ul className='overflow-scroll h-[600px]'>
                        {loading ? (
                            <p>Loading...</p>
                        ) : (
                            chatrooms.map(chatroom => (
                                <div className='bg-gray-100 m-2 w-96 overflow-scroll'>
                                    <div key={chatroom.roomId} className='flex flex-col justify-between p-2'> 
                                        <div className='flex flex-row justify-between mb-1'>
                                            <div>
                                                <strong>Name:</strong> {chatroom.roomName}
                                            </div>
                                            <button className="bg-red-200 p-1 w-20" onClick={() => handleDeleteRoom(chatroom.roomId)}><strong>DELETE</strong></button>
                                        </div>
                                        <div className='flex flex-row justify-between'>
                                            <div>
                                                <strong>Invite Code:</strong> {chatroom.inviteCode}
                                            </div>
                                            <button className={`bg-${chatroom.roomId === activeChatroomId ? 'green' : 'blue'}-200 p-1 w-20`} onClick={() => handleToggleChatroom(chatroom.roomId, chatroom.roomName)}><strong>TOGGLE</strong></button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div className='bg-gray-100 w-96 m-2 p-4 flex justify-center align-center space-x-8'>
                            <input
                                type="text"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                placeholder="Enter room name"
                                className='p-2'
                            />
                            <button onClick={handleCreateRoom} className='whitespace-nowrap p-2 bg-green-200'>Create Room</button>
                        </div>
                    </ul>
                </div>

                <div className="bg-gray-200 active-chatroom p-4 ml-5 w-[1000px]">
                    {activeChatroomId && (
                        <DynamicChatroom user={user} isLoggedIn={true} chatroomId={activeChatroomId} chatroomName={activeChatroomName} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminPanel;
