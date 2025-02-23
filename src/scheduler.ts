import { UserProfileManager } from "./user_profile.ts";
import { EventSuggester } from "./event_suggester.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const SCRAPE_INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours (3 times per day)
const SMTP_CONFIG = {
    hostname: Deno.env.get("SMTP_HOSTNAME") || "",
    port: Number(Deno.env.get("SMTP_PORT")) || 587,
    username: Deno.env.get("SMTP_USERNAME") || "",
    password: Deno.env.get("SMTP_PASSWORD") || ""
};

export class Scheduler {
    private userManager: UserProfileManager;
    private eventSuggester: EventSuggester;
    private lastScrapeTime: number = 0;
    private connections: Map<string, WebSocket[]> = new Map();

    constructor(userManager: UserProfileManager) {
        this.userManager = userManager;
        this.eventSuggester = new EventSuggester(userManager);
    }

    start() {
        // Check every minute if it's time to scrape
        setInterval(() => this.checkAndScrape(), 60 * 1000);
    }

    private async checkAndScrape() {
        const now = Date.now();
        if (now - this.lastScrapeTime >= SCRAPE_INTERVAL_MS) {
            console.log("Starting scheduled scrape...");
            await this.scrapeAllSources();
            this.lastScrapeTime = now;
        }
    }

    private async scrapeAllSources() {
        const profiles = Object.values(this.userManager.getUserProfiles());
        
        for (const profile of profiles) {
            try {
                const result = await this.eventSuggester.forward({
                    userProfile: profile
                });

                // Notify connected clients
                if (result.suggestions.length > 0) {
                    this.notifyUser(profile.id, {
                        type: "new_suggestions",
                        suggestions: result.suggestions
                    });

                    // Send email if we have suggestions and SMTP is configured
                    if (profile.email && SMTP_CONFIG.hostname) {
                        await this.sendEmail(profile.email, this.buildEmailBody(profile, result.suggestions));
                    }
                }

            } catch (error) {
                console.error(`Error scraping sources for user ${profile.id}:`, error);
            }
        }
    }

    private buildEmailBody(profile: any, suggestions: any[]): string {
        return `Hello ${profile.name},

Here are your new event suggestions:

${suggestions.map(suggestion => `
- ${suggestion.title || 'Untitled Event'}
  ${suggestion.description || 'No description available'}
  ${suggestion.url || ''}`).join('\n')}

Best regards,
Serendipity Team`;
    }

    private async sendEmail(to: string, body: string) {
        try {
            const smtp = new SmtpClient();
            await smtp.connect(SMTP_CONFIG);
            await smtp.send({
                from: "noreply@serendipityapp.com",
                to,
                subject: "Your Daily Serendipity Digest",
                content: body,
            });
            await smtp.close();
        } catch (err) {
            console.error("Error sending email:", err);
        }
    }

    addConnection(userId: string, ws: WebSocket) {
        if (!this.connections.has(userId)) {
            this.connections.set(userId, []);
        }
        this.connections.get(userId)?.push(ws);

        ws.onclose = () => {
            const connections = this.connections.get(userId);
            if (connections) {
                const index = connections.indexOf(ws);
                if (index > -1) {
                    connections.splice(index, 1);
                }
                if (connections.length === 0) {
                    this.connections.delete(userId);
                }
            }
        };
    }

    private notifyUser(userId: string, data: unknown) {
        const connections = this.connections.get(userId);
        if (connections) {
            const message = JSON.stringify(data);
            connections.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(message);
                }
            });
        }
    }
}
