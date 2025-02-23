import { Signature, Module, Predict, tool_fetchData, tool_extractData, findTool } from "./dspy_mock.ts";
import { parseISO, parse, isValid } from "date-fns";
import * as cheerio from "cheerio";
import type { UserProfile, EventSourceConfig } from "./user_profile.ts";
import { UserProfileManager } from "./user_profile.ts";

interface EventSuggestion {
    title: string;
    description: string;
    url: string;
    startTime: string;
    endTime?: string;
    venue?: string;
    source: string;
    confidence: number;
}

interface EventSuggesterInput {
    userProfile: UserProfile;
    startDate?: string;
    endDate?: string;
}

interface EventSuggesterOutput {
    suggestions: EventSuggestion[];
}

class EventSuggester extends Predict {
    private userProfileManager: UserProfileManager;
    private _events: EventSuggestion[] = [];

    constructor(userProfileManager: UserProfileManager) {
        super(new Signature(["userProfile", "startDate", "endDate"], ["suggestions"]));
        this.userProfileManager = userProfileManager;
    }

    static ScrapingAgent = class extends Predict {
        constructor() {
            super(
                new Signature(
                    ["source"],
                    ["events"]
                )
            );
        }

        override async predict(inputs: {source: EventSourceConfig}): Promise<{ events: EventSuggestion[] }> {
            const source = inputs.source;
            const selectors = source.selectors || {
                title: "h2.event-title",
                description: "div.event-description",
                datetime: "span.event-date",
                location: "p.event-location"
            };

            try {
                console.log(`Fetching data from ${source.url}`);
                const html = await tool_fetchData(source.url);
                console.log(`Received HTML:`, html.substring(0, 200) + '...');
                const $ = cheerio.load(html);
                const events: EventSuggestion[] = [];

                console.log(`Looking for titles with selector: ${selectors.title}`);
                $(selectors.title).each((i, element) => {
                    const title = $(element).text().trim();
                    if (!title) return;

                    // Find elements using selectors
                    const description = selectors.description ? $(selectors.description).eq(i).text().trim() : '';
                    const datetime = selectors.datetime ? $(selectors.datetime).eq(i).text().trim() : '';
                    const venue = selectors.location ? $(selectors.location).eq(i).text().trim() : '';

                    console.log(`Event details:`, {
                        title,
                        description,
                        datetime,
                        venue
                    });

                    console.log(`Found event: ${title}`);
                    events.push({
                        title,
                        description,
                        url: source.url,
                        startTime: datetime,
                        venue,
                        source: source.url,
                        confidence: 0.7
                    });
                });

                console.log(`Total events found: ${events.length}`);
                return { events };
            } catch (error) {
                console.error("Error in ScrapingAgent predict:", error);
                return { events: [] };
            }
        }
    };

    createScrapingAgent(source: EventSourceConfig): string {
        const agentCode = `
const cheerio = require("cheerio");
const { Predict, Signature, tool_fetchData, tool_extractData, findTool } = require("./dspy_mock");
const { parseISO, parse, isValid } = require("date-fns");

class ScrapingAgent extends Predict {
    constructor() {
        super(
            new Signature(
                ["source"],
                ["events"]
            )
        );
    }

    async predict(inputs) {
        const source = inputs.source;
        const selectors = source.selectors || {
            title: "h1, h2, h3",
            description: "p, .description, .summary",
            datetime: "time, .date, .datetime, meta[itemprop=startDate], meta[itemprop=endDate]",
            location: ".location, .venue, meta[itemprop=location]",
        };

        try {
            const html = await tool_fetchData(source.url);
            const $ = cheerio.load(html);
            const events = [];

            $(selectors.title).each((i, element) => {
                const title = $(element).text().trim();
                if (!title) return;

                const eventElement = $(element).closest('div, article, li, .event');
                const description = tool_extractData(html, selectors.description);
                const dateTimes = tool_extractData(html, selectors.datetime);
                
                let startTime = "";
                let endTime = "";
                if (dateTimes && dateTimes !== "No elements found matching selector.") {
                    const parsedDate = parseISO(dateTimes);
                    if (isValid(parsedDate)) {
                        startTime = parsedDate.toISOString();
                    } else {
                        const formats = [
                            "yyyy-MM-dd'T'HH:mm:ss",
                            "yyyy-MM-dd'T'HH:mm",
                            "MM/dd/yyyy HH:mm",
                            "MM/dd/yyyy",
                            "yyyy-MM-dd",
                            "MMM dd, yyyy",
                            "MMM dd, yyyy HH:mm",
                            "dd MMM yyyy HH:mm",
                            "dd MMM yyyy"
                        ];

                        for (const format of formats) {
                            try {
                                const parsedDate = parse(dateTimes, format, new Date());
                                if (isValid(parsedDate)) {
                                    startTime = parsedDate.toISOString();
                                    break;
                                }
                            } catch (error) {
                                continue;
                            }
                        }
                    }
                }

                const venue = tool_extractData(html, selectors.location);
                events.push({
                    title,
                    description: description !== "No elements found matching selector." ? description : "",
                    url: source.url,
                    startTime,
                    endTime,
                    venue: venue !== "No elements found matching selector." ? venue : undefined,
                    source: source.url,
                    confidence: 0.7,
                });
            });
            
            return { events };

        } catch (error) {
            console.error("Error in ScrapingAgent predict:", error);
            return { events: [] };
        }
    }
}
return new ScrapingAgent();`;
        return agentCode;
    }

    async forward(input: EventSuggesterInput): Promise<EventSuggesterOutput> {
        try {
            const { userProfile, startDate, endDate } = input;
            this._events = [];
            const allSuggestions: EventSuggestion[] = [];

            // Iterate through event sources
            for (const source of userProfile.eventSources) {
                try {
                    const agent = new EventSuggester.ScrapingAgent();
                    const result = await agent.predict({ source });
                    
                    if (result.events && Array.isArray(result.events)) {
                        this._events.push(...result.events);
                    }

                } catch (error) {
                    console.error(`Error executing scraping agent for ${source.url}:`, error);
                }
            }

            // Deduplication
            const uniqueEvents = new Map<string, EventSuggestion>();
            for (const event of this._events) {
                const key = `${event.title}-${event.startTime}-${event.venue}`;
                if (!uniqueEvents.has(key)) {
                    const interestScore = this.calculateInterestScore(event, userProfile);
                    if (interestScore > 0) {
                        uniqueEvents.set(key, {
                            ...event,
                            confidence: event.confidence * (1 + interestScore)  // Boost confidence based on interest score
                        });
                    }
                }
            }

            const suggestions = Array.from(uniqueEvents.values())
                .sort((a, b) => b.confidence - a.confidence);

            return { suggestions };

        } catch (error) {
            console.error('Error in EventSuggester:', error);
            return { suggestions: [] };
        }
    }

    private calculateInterestScore(event: EventSuggestion, userProfile: UserProfile): number {
        let score = 0;
        let matches = 0;

        const text = `${event.title} ${event.description}`.toLowerCase();

        // Score based on user's direct interests
        for (const [interest, weight] of Object.entries(userProfile.interests)) {
            if (text.includes(interest.toLowerCase())) {
                score += weight;
                matches++;
            }
        }

        // Boost score if network connections with high confidence share similar interests
        for (const connection of Object.values(userProfile.network)) {
            if (connection.confidence >= 0.7) {  // Only consider strong connections
                for (const interest of connection.interests) {
                    if (text.includes(interest.toLowerCase())) {
                        score += 0.1;  // Small boost for each matching network interest
                        matches++;
                    }
                }
            }
        }

        return matches > 0 ? score/matches : 0;
    }

    prepareAgentCodeForStorage(source: EventSourceConfig): string {
        return this.createScrapingAgent(source);
    }
}

export { EventSuggester };
export type { 
    EventSuggesterInput,
    EventSuggesterOutput,
    EventSuggestion 
};
