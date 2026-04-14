// Backend enum values (System.Text.Json serializes as integers)
export const UserTypeEnum = {
    Client: 0,
    Musician: 1,
    BandMember: 2,
    Admin: 3,
} as const;

export const OriginEnum = {
    SignUp: 0,
    GroupContact: 1,
} as const;

export interface User {
    id: number;
    auth0Id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    userType: number;  // See UserTypeEnum
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
    userType?: number;
    profilePictureUrl?: string;
    origin?: number;
}

export interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    profilePictureUrl?: string;
    locationText?: string;
}
