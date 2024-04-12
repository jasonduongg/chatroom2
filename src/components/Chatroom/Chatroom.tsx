import React, { useState, useEffect, useRef } from 'react';
import Ably from 'ably';
import { v4 as uuidv4 } from 'uuid';

function Chatroom({ user, isLoggedIn }) {
    const [ablyClient, setAblyClient] = useState(null);
    const [channel, setChannel] = useState(null);
    const [messages, setMessages] = useState([]); // Initialize as an array
    const [newMessage, setNewMessage] = useState('');
    const bottomOfChat = useRef(null);

    useEffect(() => {
        if (bottomOfChat.current) {
            bottomOfChat.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const initializeChat = async () => {
        if (isLoggedIn && !ablyClient) {
            try {
                const response = await fetch('http://localhost:443/getMessages');
                const fetchedMessages = await response.json();
                const parsedMessages = fetchedMessages.map(message => {
                    return {
                        timestamp: message.TIMESTAMP,
                        customer_id: message.CUSTOMER_ID,
                        customer_name: message.CUSTOMER_NAME,
                        message: message.MESSAGE
                    };
                })
                
                setMessages(parsedMessages);

                const ablyKey = process.env.REACT_APP_ABLY_KEY;
                const client = new Ably.Realtime.Promise({ key: ablyKey });
                const chatChannel = client.channels.get('chat');

                chatChannel.subscribe((message) => {
                    setMessages(prevMessages => [...prevMessages, message.data]
                      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))); // Sort messages on update
                });

                setAblyClient(client);
                setChannel(chatChannel);
            } catch (error) {
                console.error('Error Initializing Chatroom:', error);
            }
        }
    };

    useEffect(() => {
        if (isLoggedIn && !ablyClient) {
            initializeChat();
        }
    }, [isLoggedIn]);

    const handleEnter = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          sendMessage();
        }
      };

    const sendMessage = async () => {
        if (channel && newMessage.trim() !== '') {
            const timestamp = new Date().toISOString();
            const userDataAbly = {
                timestamp,
                customer_name: user.name,
                customer_id: user.id,
                message: newMessage
            };
            const userDataDB = {
                TIMESTAMP: timestamp,
                CUSTOMER_NAME: user.name,
                CUSTOMER_ID: user.id,
                MESSAGE: newMessage
            };
            channel.publish("update", userDataAbly);
            fetch('http://localhost:443/sendMessage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userDataDB)
            })
            .then(response => console.log('Message added', response))
            .catch(error => console.error('Failed to add message:', error));
            setNewMessage("");
        }
    };

    return (
        <div className = "flex flex-col items-center">

        
        <div className='flex flex-col items-left'>
            <div className='w-min'>
                <h1 className='text-3xl whitespace-nowrap p-4 pl-0'>Ms.Johnson's Classroom</h1>
            </div>
                <div className="flex flex-col bg-[#f5f5f5] rounded-3xl border border-gray-400 border-dashed w-[850px]">
                    <div className='h-[250px] overflow-y-scroll mb-8 justify-center'>
                        <div className='flex flex-col'>
                        {Object.entries(messages).map(([index, message]) => (
                                <div key={`${message.timestamp}-${message.customer_id}`}
                                    className={`${
                                        user.id === message.customer_id 
                                        ? 'bg-[#90ee90] text-right justify-end self-end' 
                                        : 'bg-[#ffffff] text-left justify-start self-start'} 
                                        flex max-w-[80%] p-2 mr-8 ml-8 mb-3 rounded-xl`}
                                >
                                    <div>
                                    </div>
                                    <p className={`large-xl leading-normal break-all mr-4 ml-4`}
                                        >{"[" + message.timestamp.slice(11,19) + "] " + message.customer_name + ": " + message.message}</p>
                            </div>
                        ))}
    
                        </div>
                        <div ref={bottomOfChat}></div>
                    </div>
    
                    <div className='flex justify-center'>
                        <div className='flex flex-row space-x-2 w-full pb-10 pr-10 pl-10'>
                            <input className="border-[1px] border-black w-[80%] rounded-3xl p-1 pl-4" type="text" value={newMessage} placeholder="Message... ( Ms.Johnson's Classroom )" onKeyDown={handleEnter} onChange={(e) => setNewMessage(e.target.value)} />
                            <button className="border-[1px] border-black w-[20%] rounded-3xl pl-2 pr-2 hover:border-green-300 hover:bg-green-300 duration-200" onClick={sendMessage}>Send</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
    
}

export default Chatroom;
