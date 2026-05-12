export interface Musician {
    id: number;
    userId: number;
    yearsExperience: number;
    shortBio?: string;
    isOpenToJoin: boolean;
}

export interface CreateMusicianDto {
    userInfo: {
        auth0Id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone?: string;
        userType: number;  // Backend enum: Client=0, Musician=1, BandMember=2, Admin=3
        origin: number;    // Backend enum: SignUp=0, GroupContact=1
    };
    musicianProfile: {
        shortBio?: string;
        yearsExperience: number;
        isOpenToJoin: boolean;
    };
    idGroup: number;
}

export interface MusicianProfileData {
    shortBio?: string;
    yearsExperience: number;
    isOpenToJoin: boolean;
}
