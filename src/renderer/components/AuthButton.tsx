import React from "react";

import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../../authConfig";


export default function AuthButton() {
    const { instance, accounts } = useMsal();
    const isSignedIn = accounts.length > 0;

    const signIn = () => { 
        instance.loginRedirect(loginRequest);
    };

    const signOut = () => { 
        instance.logoutRedirect();
    };

    return (
        <>
            {!isSignedIn && (
                <button onClick={signIn}>
                    Sign In
                </button>
            )}

            {isSignedIn && (
                <button onClick={signOut}>
                    Sign Out
                </button>
            )}  
        </>        
    );
}