import React, { useState, useEffect } from 'react';
import { googleLogout, useGoogleLogin } from '@react-oauth/google';

import AdminPanel from "./components/AdminPanel/AdminPanel.tsx"
import UserPanel from "./components/UserPanel/UserPanel.tsx"


function App() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isAdmin, setAdmin] = useState(false);

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
                addUserToDatabase(data);
                checkAdminStatus(data)
            })
            .catch(error => console.log(error));
        }
    }, [user]);

    const checkAdminStatus = (profile) => {
        const { id, email } = profile;
        fetch(`http://localhost:443/checkAdmin?customer_id=${id}&customer_email=${email}`)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.exists) {
                setAdmin(true);
            } else {
                setAdmin(false);
            }
        })
        .catch(error => {
            console.error('Failed to check admin status:', error);
            setAdmin(false);
        });
    };
    
    
    const addUserToDatabase = (googleProfile) => {
        const userData = {
            CUSTOMER_ID: googleProfile.id, // Assuming CUSTOMER_ID is a string
            CUSTOMER_EMAIL: googleProfile.email,
            CUSTOMER_NAME: googleProfile.name
        };

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

    console.log(isAdmin)
    return (
        <div>
            {profile ? (
                <div>
                    <button className="border-2 border-red-400 p-2 "onClick={logOut}>Log out</button>

                    <p>ID: {profile.id}</p>
                    <p>Name: {profile.name}</p>
                    <p>Email: {profile.email}</p>
                    <p>Admin Status: {String(isAdmin)}</p>
            
                    {isAdmin ? (
                        <>
                            <AdminPanel user = {profile}/>
                        </>
                    ) : (
                        <>
                            <UserPanel user={profile}/>
                        </>
                    )}
                </div>
            ) : (
                <button onClick={() => login()}>Sign in with Google 🚀</button>
            )}
        </div>
    );
}

export default App;
