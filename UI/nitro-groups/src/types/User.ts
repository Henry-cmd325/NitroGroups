// Backend enum values (API serializes as strings via JsonStringEnumConverter)
export const UserTypeEnum = {
    Client: "Client",
    Musician: "Musician",
    BandMember: "BandMember",
    Admin: "Admin",
} as const;

// Create a type from the object values
export type UserType = typeof UserTypeEnum[keyof typeof UserTypeEnum];

export const OriginEnum = {
    SignUp: "SignUp",
    GroupContact: "GroupContact",
} as const;

export type Origin = typeof OriginEnum[keyof typeof OriginEnum];

export interface User {
    id: number;
    auth0Id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    userType: UserType;
    profilePictureUrl?: string;
    locationText?: string;
    createdAt: string;
    lastLoginAt?: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    active: boolean;
}

export interface CreateUserDto {
    auth0Id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    userType?: string;
    profilePictureUrl?: string;
    origin?: string;
}

export interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    profilePictureUrl?: string;
    locationText?: string;
}
