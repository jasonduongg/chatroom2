import React, { useState, useEffect, useRef } from 'react';
import { ablyClient } from '../../ably.jsx'
import { v4 as uuidv4 } from 'uuid';

function Chatroom({ user, isLoggedIn, chatroomId, chatroomName }) {
    const [channel, setChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const bottomOfChat = useRef(null);

    useEffect(() => {
        if (bottomOfChat.current) {
            bottomOfChat.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const cleanupChat = () => {
        if (channel) {
            channel.unsubscribe();
            channel.detach();  // Ensure to detach the channel as well
            setChannel(null);
        }
        setMessages([]);
    };

    const initializeChat = async () => {
        if (isLoggedIn && chatroomId) {
            cleanupChat(); // Clean up previous chat data and subscriptions
            try {
                const response = await fetch(`http://localhost:443/getMessages?roomId=${chatroomId}`);
                const fetchedMessages = await response.json();
                const parsedMessages = fetchedMessages.map(message => {
                    return {
                        TIMESTAMP: message.TIMESTAMP,
                        CUSTOMER_ID: message.CUSTOMER_ID,
                        CUSTOMER_NAME: message.CUSTOMER_NAME,
                        MESSAGE: message.MESSAGE
                    };
                });
                
                setMessages(parsedMessages);
        
                const chatChannel = ablyClient.channels.get(chatroomId);

                chatChannel.subscribe("update", (message) => {
                    setMessages(prevMessages => [...prevMessages, message.data]
                      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))); // Sort messages on update
                });

                setChannel(chatChannel);
            } catch (error) {
                console.error('Error Initializing Chatroom:', error);
            }
        }
    };

    useEffect(() => {
        if (isLoggedIn && chatroomId) {
            initializeChat();
        }

        return () => cleanupChat(); // Cleanup on component unmount or when the chatroomId changes
    }, [isLoggedIn, chatroomId]);

    const handleEnter = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          sendMessage();
        }
    };

    const sendMessage = async () => {
        if (channel && newMessage.trim() !== '') {
            const timestamp = new Date().toISOString();
            const messageData = {
                TIMESTAMP: timestamp,
                CUSTOMER_NAME: user.name,
                CUSTOMER_ID: user.id,
                MESSAGE: newMessage,
                ROOMID: chatroomId
            };
            channel.publish("update", messageData);
            fetch('http://localhost:443/sendMessage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageData)
            })
            .then(response => console.log('Message added', response))
            .catch(error => console.error('Failed to add message:', error));
            setNewMessage("");
        }
    };
    return (
        <div className="flex flex-col items-center">
            <div className='flex flex-col items-left'>
                <div className='w-min'>
                    <h1 className='text-3xl whitespace-nowrap p-4 pl-0'>{chatroomName}</h1>
                </div>
                <div className="flex flex-col bg-[#f5f5f5] rounded-3xl border border-gray-400 border-dashed w-[850px]">
                    <div className='h-[250px] overflow-y-scroll mb-8 justify-center'>
                        <div className='flex flex-col'>
                            {messages.map((message, index) => (
                                <div key={`${message.TIMESTAMP}-${message.CUSTOMER_ID}`}
                                    className={`${user.id === message.CUSTOMER_ID ? 'bg-[#90ee90] text-right justify-end self-end' : 'bg-[#ffffff] text-left justify-start self-start'} flex max-w-[80%] p-2 mr-8 ml-8 mb-3 rounded-xl`}>
                                    <p className="large-xl leading-normal break-all mr-4 ml-4">
                                        {"[" + message.TIMESTAMP.slice(11,19) + "] " + message.CUSTOMER_NAME + ": " + message.MESSAGE}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div ref={bottomOfChat}></div>
                    </div>
                    <div className='flex justify-center'>
                        <div className='flex flex-row space-x-2 w-full pb-10 pr-10 pl-10'>
                            <input className="border-[1px] border-black w-[80%] rounded-3xl p-1 pl-4" type="text" value={newMessage} placeholder={"Message... " + chatroomName} onKeyDown={handleEnter} onChange={(e) => setNewMessage(e.target.value)} />
                            <button className="border-[1px] border-black w-[20%] rounded-3xl pl-2 pr-2 hover:border-green-300 hover:bg-green-300 duration-200" onClick={sendMessage}>Send</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Chatroom;
