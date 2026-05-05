import { NextRequest, NextResponse } from "next/server";

interface SignupRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    userType: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: SignupRequest = await request.json();
        const { email, password, firstName, lastName, userType } = body;

        // Validate required fields
        if (!email || !password || !firstName || !lastName) {
            return NextResponse.json(
                { error: "Todos los campos son requeridos" },
                { status: 400 }
            );
        }

        // Get Auth0 config from environment
        const auth0Domain = process.env.AUTH0_DOMAIN;
        const clientId = process.env.AUTH0_CLIENT_ID;
        const connection = process.env.AUTH0_DB_CONNECTION || "Username-Password-Authentication";

        if (!auth0Domain || !clientId) {
            console.error("Missing Auth0 configuration");
            return NextResponse.json(
                { error: "Error de configuración del servidor" },
                { status: 500 }
            );
        }

        // Call Auth0 Database Signup API
        const auth0Response = await fetch(`https://${auth0Domain}/dbconnections/signup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                client_id: clientId,
                email,
                password,
                connection,
                user_metadata: {
                    first_name: firstName,
                    last_name: lastName,
                    user_type: userType,
                },
            }),
        });

        const auth0Data = await auth0Response.json();

        if (!auth0Response.ok) {
            // Handle specific Auth0 errors
            let errorMessage = "Error al crear la cuenta";

            if (auth0Data.code === "invalid_signup") {
                errorMessage = "Este correo ya está registrado";
            } else if (auth0Data.code === "invalid_password") {
                errorMessage = auth0Data.description || "La contraseña no cumple con los requisitos";
            } else if (auth0Data.description) {
                errorMessage = auth0Data.description;
            }

            return NextResponse.json(
                { error: errorMessage },
                { status: auth0Response.status }
            );
        }

        // Success - return user ID
        return NextResponse.json({
            success: true,
            userId: auth0Data._id,
            email: auth0Data.email,
        });
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
