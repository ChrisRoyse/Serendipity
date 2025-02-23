import { SerendipityAgent, SerendipityInput, SerendipityOutput, ConnectionSuggestion, NudgeSuggestion } from "./serendipity_agent.ts";
import { UserProfileManager, UserProfile } from "./user_profile.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { describe, beforeEach, it as test } from "https://deno.land/std@0.208.0/testing/bdd.ts";
import { EventSuggestion } from "./event_suggester.ts";

describe("SerendipityAgent", () => {
    let userProfileManager: UserProfileManager;
    let agent: SerendipityAgent;
    let testProfile: UserProfile;

    beforeEach(async () => {
        userProfileManager = new UserProfileManager();
        agent = new SerendipityAgent(userProfileManager);

        // Create a test profile
        testProfile = await userProfileManager.createUserProfile({
            name: "Test User",
            email: "test@example.com",
            location: "San Francisco",
            availability: "weekends",
            password: "test123"
        });

        // Add test interests
        await userProfileManager.addInterest(testProfile.id, "artificial intelligence", 0.9);
        await userProfileManager.addInterest(testProfile.id, "blockchain", 0.7);
        await userProfileManager.addInterest(testProfile.id, "startup networking", 0.8);

        // Add test network connections
        await userProfileManager.addNetworkConnection(testProfile.id, {
            id: "john_doe",
            name: "John Doe",
            skills: ["machine learning", "python"],
            interests: ["artificial intelligence", "data science"],
            confidence: 0.2
        });
        await userProfileManager.addNetworkConnection(testProfile.id, {
            id: "jane_smith",
            name: "Jane Smith",
            skills: ["blockchain development", "smart contracts"],
            interests: ["blockchain", "cryptocurrency"],
            confidence: 0.9
        });
        await userProfileManager.addNetworkConnection(testProfile.id, {
            id: "bob_wilson",
            name: "Bob Wilson",
            skills: ["business development", "marketing"],
            interests: ["startup networking", "venture capital"],
            confidence: 0.1
        });

        // Add test event sources
        await userProfileManager.addEventSource(testProfile.id, {
            url: "http://localhost:8000/mock-events",
            type: "tech-meetup",
            selectors: {
                title: "h2.event-title",
                description: "div.event-description",
                datetime: "span.event-date",
                location: "p.event-location"
            }
        });
    });

    test("should analyze profile and generate suggestions", async () => {
        const input: SerendipityInput = {
            userProfile: testProfile,
            goals: ["find AI collaborators", "learn blockchain"],
            timeframe: {
                start: "2025-03-01",
                end: "2025-03-31"
            }
        };

        const result = await agent.predict(input);

        assertEquals(typeof result, 'object');
        assertEquals(Array.isArray(result.suggestions), true);
        assertEquals(result.suggestions.length > 0, true);

        // Verify suggestion types
        const types = new Set(result.suggestions.map((s: SerendipityOutput["suggestions"][0]) => s.type));
        assertEquals(types.has("event"), true);
        assertEquals(types.has("connection"), true);
        assertEquals(types.has("nudge"), true);

        // Verify suggestions are sorted by priority
        const priorities = result.suggestions.map((s: SerendipityOutput["suggestions"][0]) => s.priority);
        assertEquals(priorities, [...priorities].sort((a, b) => b - a));

        // Verify connection suggestions for weak network connections
        const connectionSuggestions = result.suggestions.filter((s: SerendipityOutput["suggestions"][0]) => s.type === "connection");
        assertEquals(connectionSuggestions.some((s: SerendipityOutput["suggestions"][0]) => {
            const suggestion = s.suggestion as ConnectionSuggestion;
            return suggestion.contact === "john_doe" || suggestion.contact === "bob_wilson";
        }), true);

        // Verify event suggestions match interests
        const eventSuggestions = result.suggestions.filter((s: SerendipityOutput["suggestions"][0]) => s.type === "event");
        eventSuggestions.forEach((s: SerendipityOutput["suggestions"][0]) => {
            const event = s.suggestion as EventSuggestion;
            assertEquals(
                event.title.toLowerCase().includes("ai") ||
                event.title.toLowerCase().includes("blockchain") ||
                event.description.toLowerCase().includes("ai") ||
                event.description.toLowerCase().includes("blockchain"),
                true
            );
        });
    });

    test("should adjust priorities based on goals", async () => {
        const input: SerendipityInput = {
            userProfile: testProfile,
            goals: ["find AI collaborators"]
        };

        const result = await agent.predict(input);

        // Verify AI-related suggestions have higher priority
        const aiSuggestions = result.suggestions.filter((s: SerendipityOutput["suggestions"][0]) => 
            s.reasoning.toLowerCase().includes("ai") ||
            (s.type === "event" && ((s.suggestion as EventSuggestion).title.toLowerCase().includes("ai") ||
                                  (s.suggestion as EventSuggestion).description.toLowerCase().includes("ai")))
        );

        aiSuggestions.forEach((s: SerendipityOutput["suggestions"][0]) => {
            assertEquals(s.priority > 0.5, true);
        });
    });

    test("should maintain suggestion history in memory", async () => {
        const input: SerendipityInput = {
            userProfile: testProfile
        };

        // Make multiple predictions
        await agent.predict(input);
        await agent.predict(input);
        await agent.predict(input);

        // Access private memory field for testing
        const memory = (agent as any).memory.get(testProfile.id);
        
        assertEquals(typeof memory, 'object');
        assertEquals(Array.isArray(memory.suggestionHistory), true);
        assertEquals(memory.suggestionHistory.length > 0, true);
        assertEquals(memory.suggestionHistory.length <= 10, true);

        // Verify suggestion history structure
        const lastSuggestion = memory.suggestionHistory[memory.suggestionHistory.length - 1];
        assertEquals(typeof lastSuggestion.timestamp, 'string');
        assertEquals(Array.isArray(lastSuggestion.suggestions), true);
        assertEquals(typeof lastSuggestion.suggestions[0].type, 'string');
        assertEquals(typeof lastSuggestion.suggestions[0].priority, 'number');
        assertEquals(typeof lastSuggestion.suggestions[0].reasoning, 'string');
    });

    test("should handle errors gracefully", async () => {
        const input: SerendipityInput = {
            userProfile: {
                ...testProfile,
                interests: undefined // Introduce an error
            } as any
        };

        const result = await agent.predict(input);

        assertEquals(typeof result, 'object');
        assertEquals(result.suggestions, []);
    });
});
