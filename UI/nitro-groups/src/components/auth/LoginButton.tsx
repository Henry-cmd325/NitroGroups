"use client";

export default function LoginButton() {
    return (
        <a
            href="/login?returnTo=/dashboard/musician"
            className="button login"
        >
            Log In
        </a>
    );
}