"use client";

export default function LoginButton() {
    return (
        <a
            href="/auth/login?returnTo=/dashboard/musician"
            className="button login"
        >
            Log In
        </a>
    );
}