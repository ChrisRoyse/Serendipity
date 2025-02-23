import * as cheerio from "cheerio";
import { UserProfile, UserProfileManager } from "./user_profile.ts";

async function tool_fetchData(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error("Error in tool_fetchData:", error);
        return `Error fetching data: ${error}`;
    }
}

function tool_extractData(html: string, selector: string): string {
    const $ = cheerio.load(html);
    const elements = $(selector);

    if (elements.length === 0) {
        return "No elements found matching selector.";
    }

    const results: string[] = [];
    elements.each((i, element) => {
        let text = $(element).text().trim();
        if (!text) { //Use the HTML if no InnerText
            text = $(element).html()?.trim() || 'No Text';
        }
        results.push(text);
    });

    return results.join("\n");
}

interface Tool {
    name: string;
    description: string;
    func: (input: string) => Promise<string> | string;
}

async function tool_networkAnalyzer(input: string): Promise<string> {
    const { profileUrl } = JSON.parse(input);
    const html = await tool_fetchData(profileUrl);
    const skills = tool_extractData(html, ".pv-skill-categories-section");
    const interests = tool_extractData(html, ".pv-interests-section");
    return JSON.stringify({
        connections: [{ id: "mock-id", skills, interests, confidence: 0.8 }],
    });
}

async function tool_introductionCrafter(input: string): Promise<string> {
    const { userProfile, targetProfile, context } = JSON.parse(input);
    const message = `Hi ${targetProfile.name}, I'm ${userProfile.name}. ${context} We both seem passionate about ${targetProfile.interests[0]}. I'd love to chat about potential collaboration!`;
    return JSON.stringify({ message });
}

async function tool_routineNudger(input: string): Promise<string> {
    const { location, schedule } = JSON.parse(input);
    return JSON.stringify({
        suggestions: [{ place: `${location}-coffee-shop`, time: "10:00 AM", reason: "near event" }],
    });
}

const tools: { [key: string]: (...args: any[]) => Promise<string> | string } = {
    "fetchdata": tool_fetchData,
    "extractdata": (input: string) => {
        const [html, selector] = input.split('|||');
        return tool_extractData(html, selector);
    },
    "networkanalyzer": tool_networkAnalyzer,
    "eventsuggester": async (input: string) => {
        // Import dynamically to avoid circular dependency
        const { EventSuggester } = await import("./event_suggester.ts");
        const { userProfile, startDate, endDate } = JSON.parse(input);
        const profileManager = new UserProfileManager();
        const suggester = new EventSuggester(profileManager);
        const result = await suggester.forward({ userProfile: JSON.parse(userProfile), startDate, endDate });
        return JSON.stringify(result.suggestions);
    },
    "introductioncrafter": tool_introductionCrafter,
    "routinenudger": tool_routineNudger,
};

function findTool(toolName: string): Tool | undefined {
    const key = toolName.toLowerCase();
    if (tools[key]) {
      return { name: toolName, description: "", func: tools[key] };
    }
    return undefined;
}

class Signature {
    constructor(public inputKeys: string[], public outputKeys: string[]) {}
}

class Module {
    constructor(public config: { name: string; signature: any }) {}
}

class Predict extends Module {
    constructor(signature: any) {
        super({ name: "predict", signature });
    }

    predict(input: any): Promise<any> | any {
        return Promise.resolve();
    }
}

export {
    Signature,
    Module,
    Predict,
    tools,
    findTool,
    tool_fetchData,
    tool_extractData,
    tool_networkAnalyzer,
    tool_introductionCrafter,
    tool_routineNudger
};

export type { Tool };
