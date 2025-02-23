import { hashPassword, generateApiKey } from "./auth.ts";

interface EventSourceConfig {
    url: string;
    type: string; // e.g., 'eventbrite', 'meetup', 'custom'
    selectors?: {
        title?: string;
        description?: string;
        datetime?: string;
        location?: string;
    };
    lastScraped?: string;
    successRate?: number; // For self-improvement tracking
}

interface UserProfile {
    id: string;
    name: string;
    email: string;
    passwordHash?: string;
    apiKey?: string;
    interests: InterestGraph;
    network: NetworkGraph;
    location: string;
    availability: string;
    eventSources: EventSourceConfig[];
    successMetrics: { [action: string]: { success: number; total: number } };
}

interface CreateUserProfileData extends Omit<UserProfile, "id" | "interests" | "network" | "eventSources" | "successMetrics" | "apiKey"> {
    password?: string;
}

interface InterestGraph {
    [topic: string]: number;
}

interface NetworkConnection {
    id: string;
    name: string;
    skills: string[];
    interests: string[];
    confidence: number;
}

interface NetworkGraph {
    [contact: string]: NetworkConnection;
}

class UserProfileManager {
    private userProfiles: { [id: string]: UserProfile } = {};
    private readonly storageFile = "./user_profiles.json";

    constructor() {
        this.loadProfiles();
    }

    public async loadProfiles() {
        try {
            const text = await Deno.readTextFile(this.storageFile);
            this.userProfiles = JSON.parse(text);
        } catch (error) {
            if (!(error instanceof Deno.errors.NotFound)) {
                console.error("Error loading profiles:", error);
            }
            this.userProfiles = {};
            await this.saveProfiles();
        }
    }

    private async saveProfiles() {
        try {
            await Deno.writeTextFile(this.storageFile, JSON.stringify(this.userProfiles, null, 2));
        } catch (error) {
            console.error("Error saving profiles:", error);
        }
    }

async createUserProfile(profileData: CreateUserProfileData): Promise<UserProfile> {
        const id = Math.random().toString(36).substring(2, 15);
        console.log(`Creating user profile with ID: ${id}`);
        
        const passwordHash = profileData.password ? await hashPassword(profileData.password) : undefined;
        console.log(`Password hash generated: ${passwordHash !== undefined}`);
        
        const newProfile: UserProfile = {
            id,
            name: profileData.name,
            email: profileData.email,
            location: profileData.location,
            availability: profileData.availability || 'anytime',
            passwordHash,
            apiKey: generateApiKey(),
            interests: {},
            network: {},
            eventSources: [],
            successMetrics: {}
        };
        
        this.userProfiles[id] = newProfile;
        await this.saveProfiles();
        console.log(`User profile saved successfully with ID: ${id}`);
        return newProfile;
    }

    getUserProfile(id: string): UserProfile | undefined {
        return this.userProfiles[id];
    }

    getUserProfiles(): { [id: string]: UserProfile } {
        return this.userProfiles;
    }

    async updateUserProfile(id: string, updates: Partial<UserProfile>): Promise<UserProfile | undefined> {
        const profile = this.userProfiles[id];
        if (profile) {
            Object.assign(profile, updates);
            await this.saveProfiles();
            return profile;
        }
        return undefined;
    }

    async addInterest(id: string, topic: string, level: number): Promise<void> {
        const profile = this.userProfiles[id];
        if (profile) {
            profile.interests[topic] = Math.max(0, Math.min(1, level));
            await this.saveProfiles();
        }
    }

    async addNetworkConnection(id: string, connection: NetworkConnection): Promise<void> {
        const profile = this.userProfiles[id];
        if (profile) {
            profile.network[connection.id] = {
                ...connection,
                confidence: Math.max(0, Math.min(1, connection.confidence))
            };
            await this.saveProfiles();
        }
    }

    async addEventSource(id: string, source: EventSourceConfig): Promise<void> {
        const profile = this.userProfiles[id];
        if (profile) {
            if (!profile.eventSources) {
                profile.eventSources = [];
            }
            profile.eventSources.push({
                ...source,
                lastScraped: new Date().toISOString(),
                successRate: 1.0
            });
            await this.saveProfiles();
        }
    }

    async recordActionOutcome(id: string, action: string, success: boolean): Promise<void> {
        const profile = this.userProfiles[id];
        if (profile) {
            if (!profile.successMetrics[action]) {
                profile.successMetrics[action] = { success: 0, total: 0 };
            }
            profile.successMetrics[action].total += 1;
            if (success) {
                profile.successMetrics[action].success += 1;
            }
            await this.saveProfiles();
        }
    }

    async updateEventSourceStats(id: string, sourceUrl: string, success: boolean): Promise<void> {
        const profile = this.userProfiles[id];
        if (profile) {
            const source = profile.eventSources.find(s => s.url === sourceUrl);
            if (source && source.successRate !== undefined) {
                // Exponential moving average for success rate
                source.successRate = source.successRate * 0.9 + (success ? 0.1 : 0);
                source.lastScraped = new Date().toISOString();
                await this.saveProfiles();
            }
        }
    }

    getEventSource(id: string, sourceUrl: string): EventSourceConfig | undefined {
        const profile = this.userProfiles[id];
        if (profile) {
            return profile.eventSources.find(s => s.url === sourceUrl);
        }
        return undefined;
    }
}

export { UserProfileManager };
export type {
    UserProfile,
    EventSourceConfig,
    InterestGraph,
    NetworkGraph
};
