import React, { useState, useEffect } from 'react';
import { googleLogout, useGoogleLogin } from '@react-oauth/google';

import Chatroom from "./components/Chatroom/Chatroom.tsx"


function App() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);

    const login = useGoogleLogin({
        onSuccess: (codeResponse) => setUser(codeResponse),
        onError: (error) => console.log('Login Failed:', error)
    });

    useEffect(() => {
        if (user) {
            fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`, {
                headers: {
                    Authorization: `Bearer ${user.access_token}`,
                    Accept: 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                setProfile(data);
                addUserToDatabase(data); // Call the function to add user to database
            })
            .catch(error => console.log(error));
        }
    }, [user]);

    const addUserToDatabase = (googleProfile) => {
        const userData = {
            CUSTOMER_ID: parseInt(googleProfile.id), // Assuming CUSTOMER_ID is a string
            CUSTOMER_EMAIL: googleProfile.email,
            CUSTOMER_NAME: googleProfile.name
        };

        console.log(userData)
        fetch('http://localhost:443/setUsers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        })  
        .then(response => console.log('User added successfully:', response))
        .catch(error => console.error('Failed to add user:', error));
    };

    const logOut = () => {
        googleLogout();
        setUser(null);
        setProfile(null);
    };

    return (
        <div>
            {profile ? (
                <div>
                    {/* <p>ID: {profile.id}</p>
                    <img src={profile.picture} alt="user" />
                    <h3>User Logged in</h3>
                    <p>Name: {profile.name}</p>
                    <p>Email Address: {profile.email}</p> */}

                    <button className="border-2 border-red-400 p-2 "onClick={logOut}>Log out</button>
                    <Chatroom user={profile} isLoggedIn={true} />
                </div>
            ) : (
                <button onClick={() => login()}>Sign in with Google 🚀</button>
            )}
        </div>
    );
}

export default App;
