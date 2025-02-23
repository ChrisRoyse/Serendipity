import { Signature, Module, Predict, Tool, findTool } from "./dspy_mock.ts";
import { UserProfile, UserProfileManager, EventSourceConfig } from "./user_profile.ts";
import { EventSuggester, EventSuggestion } from "./event_suggester.ts";
import * as cheerio from "cheerio";

const SYSTEM_PROMPT = `
You are the Serendipity Engine, an AI designed to engineer beneficial chance encounters. Your goal is to connect the user with people who share interests, complement skills, or bridge networks, while suggesting events and routine changes to make these connections happen organically.

Your process follows a ReAct loop:
1. **Analyze**: Understand the user's goals, interests, and network.
2. **Identify**: Find potential connections and opportunities.
3. **Evaluate**: Assess value and likelihood of success.
4. **Strategize**: Choose the best approach (event, introduction, nudge).
5. **Act**: Execute using tools.
6. **Observe**: Track outcomes.
7. **Learn**: Refine strategies based on feedback.

Tools: {TOOL_LIST}
Output format:
- Thought: <reasoning>
- Action: <ToolName>|<input>
- Observation: <result>
- Final: <recommendation>
`;

interface SerendipityInput {
    userProfile: UserProfile;
    goals?: string[];
    timeframe?: {
        start: string;
        end: string;
    };
}

interface SerendipityOutput {
    suggestions: Array<{
        type: "event" | "connection" | "nudge";
        priority: number;
        suggestion: EventSuggestion | ConnectionSuggestion | NudgeSuggestion;
        reasoning: string;
    }>;
}

interface ConnectionSuggestion {
    contact: string;
    sharedInterests: string[];
    potentialValue: string;
    introductionStrategy: string;
}

interface NudgeSuggestion {
    action: string;
    context: string;
    expectedOutcome: string;
    timing: string;
}

class SerendipityAgent extends Predict {
    private userProfileManager: UserProfileManager;
    private eventSuggester: EventSuggester;
    private memory: Map<string, any>;

    constructor(userProfileManager: UserProfileManager) {
        super(new Signature(["userProfile", "goals"], ["suggestions"]));
        this.userProfileManager = userProfileManager;
        this.eventSuggester = new EventSuggester(userProfileManager);
        this.memory = new Map();
    }

    private async analyzeProfile(profile: UserProfile): Promise<{
        topInterests: string[];
        networkGaps: string[];
        routinePatterns: string[];
    }> {
        // Sort interests by weight
        const topInterests = Object.entries(profile.interests)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([interest]) => interest);

        // Identify network gaps by analyzing connection confidence
        const networkGaps = Object.entries(profile.network)
            .filter(([, connection]) => connection.confidence < 0.3)
            .map(([contact]) => contact);

        // Analyze event patterns from history
        const routinePatterns = profile.eventSources
            .filter((source: EventSourceConfig) => source.successRate && source.successRate > 0.7)
            .map(source => source.type);

        return {
            topInterests,
            networkGaps,
            routinePatterns
        };
    }

    private async identifyOpportunities(
        profile: UserProfile,
        analysis: {
            topInterests: string[];
            networkGaps: string[];
            routinePatterns: string[];
        },
        timeframe?: { start: string; end: string }
    ): Promise<SerendipityOutput["suggestions"]> {
        const suggestions: SerendipityOutput["suggestions"] = [];

        // Get event suggestions
        const eventResults = await this.eventSuggester.forward({
            userProfile: profile,
            startDate: timeframe?.start,
            endDate: timeframe?.end
        });

        // Convert events to suggestions
        eventResults.suggestions.forEach(event => {
            suggestions.push({
                type: "event",
                priority: event.confidence,
                suggestion: event,
                reasoning: `Event matches interests: ${analysis.topInterests.filter(interest => 
                    event.title.toLowerCase().includes(interest.toLowerCase()) || 
                    event.description.toLowerCase().includes(interest.toLowerCase())
                ).join(", ")}`
            });
        });

        // Generate connection suggestions
        for (const gap of analysis.networkGaps) {
            const connection = profile.network[gap];
            const sharedInterests = analysis.topInterests.filter(interest => 
                connection && connection.interests.includes(interest)
            );
            
            if (sharedInterests.length > 0) {
                suggestions.push({
                    type: "connection",
                    priority: 0.8,
                    suggestion: {
                        contact: gap,
                        sharedInterests,
                        potentialValue: "Potential collaboration and knowledge sharing",
                        introductionStrategy: "Suggest meeting at relevant industry event"
                    } as ConnectionSuggestion,
                    reasoning: `Strong interest overlap in: ${sharedInterests.join(", ")}`
                });
            }
        }

        // Generate routine nudges
        if (analysis.routinePatterns.length > 0) {
            suggestions.push({
                type: "nudge",
                priority: 0.6,
                suggestion: {
                    action: "Schedule regular attendance",
                    context: `Regular participation in ${analysis.routinePatterns[0]} events`,
                    expectedOutcome: "Strengthen network connections and stay updated in field",
                    timing: "Weekly"
                } as NudgeSuggestion,
                reasoning: "Consistent engagement leads to stronger network connections"
            });
        }

        return suggestions.sort((a, b) => b.priority - a.priority);
    }

    override async predict(input: SerendipityInput): Promise<SerendipityOutput> {
        const { userProfile, goals } = input;
        const profile = userProfile;
        let thoughts: string[] = [];
        let actions: string[] = [];
        let observations: string[] = [];

        try {
            // 1. Analyze
            console.log(`Analyzing user profile: ${profile.id}, goals: ${goals?.join(", ")}`);
            const analysis = await this.analyzeProfile(profile);
            console.log(`Analysis complete. Top interests: ${analysis.topInterests.join(", ")}`);

            // 2. Identify (Network Analysis)
            console.log(`Starting network analysis for event sources:`, profile.eventSources);
            const networkResult = await this.identifyOpportunities(profile, analysis, input.timeframe);
            console.log(`Found opportunities:`, networkResult);

            // 3. Evaluate & Strategize
            thoughts.push(`Evaluating opportunities and adjusting priorities based on goals`);
            const suggestions = networkResult.map(opp => ({
                ...opp,
                priority: this.adjustPriorityBasedOnGoals(opp, goals, profile)
            }));

            // 4. Act
            if (suggestions.length > 0) {
                thoughts.push(`Selected top ${Math.min(3, suggestions.length)} suggestions for action`);
                actions.push(`suggestionexecutor|${JSON.stringify({
                    suggestions: suggestions.slice(0, 3)
                })}`);
            }

            // 5. Observe & Learn
            thoughts.push("Tracking outcomes to refine future suggestions");
            this.updateMemory(profile.id, suggestions);

            return { suggestions };
        } catch (error: unknown) {
            console.error("Error in SerendipityAgent predict:", error);
            thoughts.push(`Error encountered: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { suggestions: [] };
        }
    }

    private adjustPriorityBasedOnGoals(
        opportunity: SerendipityOutput["suggestions"][0],
        goals?: string[],
        userProfile?: UserProfile
    ): number {
        let priority = opportunity.priority;

        // Adjust based on success metrics
        let userId: string | undefined;
        
        if (opportunity.type === "connection") {
            userId = (opportunity.suggestion as ConnectionSuggestion).contact;
        } else if (opportunity.type === "event") {
            // For events, use the current user's metrics
            userId = userProfile?.id;
        } else {
            // For nudges, use the current user's metrics
            userId = userProfile?.id;
        }

        const metrics = userId 
            ? this.userProfileManager.getUserProfile(userId)?.successMetrics?.[opportunity.type]
            : undefined;

        if (metrics && metrics.total > 0) {
            const successRate = metrics.success / metrics.total;
            priority *= (0.5 + successRate); // Scale priority based on past success
        }

        // Adjust based on goals
        if (goals && goals.length > 0) {
            const relevanceBoost = goals.some(goal => {
                const goalLower = goal.toLowerCase();
                if (opportunity.type === "event") {
                    const event = opportunity.suggestion as EventSuggestion;
                    return event.title.toLowerCase().includes(goalLower) ||
                           event.description.toLowerCase().includes(goalLower);
                }
                return opportunity.reasoning.toLowerCase().includes(goalLower);
            }) ? 0.2 : 0;
            priority += relevanceBoost;
        }

        return Math.min(1, priority);
    }

    private async updateMemory(userId: string, suggestions: SerendipityOutput["suggestions"]): Promise<void> {
        const userMemory = this.memory.get(userId) || {
            suggestionHistory: [],
            successfulStrategies: new Set<string>()
        };

        userMemory.suggestionHistory.push({
            timestamp: new Date().toISOString(),
            suggestions: suggestions.map(s => ({
                type: s.type,
                priority: s.priority,
                reasoning: s.reasoning
            }))
        });

        // Keep last 10 suggestions
        if (userMemory.suggestionHistory.length > 10) {
            userMemory.suggestionHistory.shift();
        }

        this.memory.set(userId, userMemory);

        // Record outcomes in user profile
        for (const suggestion of suggestions) {
            const success = suggestion.priority > 0.7; // Consider high priority suggestions as successful
            await this.userProfileManager.recordActionOutcome(userId, suggestion.type, success);
        }
    }
}

export { SerendipityAgent };
export type {
    SerendipityInput,
    SerendipityOutput,
    ConnectionSuggestion,
    NudgeSuggestion
};
