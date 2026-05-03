import React from "react";

import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../../authConfig";

interface AuthButtonProps {
    className?: string;
}

export default function AuthButton({ className = '' }: AuthButtonProps) {
    const { instance, accounts } = useMsal();
    const isSignedIn = accounts.length > 0;

    const handleClick = () => {
        if (isSignedIn) {
            instance.logoutRedirect();
        } else {
            instance.loginRedirect(loginRequest);
        }
    };

    return (
        <button className={`auth-button ${className}`} onClick={handleClick}>
            {isSignedIn ? 'Sign Out' : 'Sign In'}
        </button>
    );
}