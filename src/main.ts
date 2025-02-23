import { UserProfileManager, UserProfile } from "./user_profile.ts";
import { SerendipityAgent, SerendipityInput, SerendipityOutput } from "./serendipity_agent.ts";
import { authMiddleware, generateToken, hashPassword, verifyToken } from "./auth.ts";
import { Scheduler } from "./scheduler.ts";

// Create instances
const userManager = new UserProfileManager();
const serendipityAgent = new SerendipityAgent(userManager);
const scheduler = new Scheduler(userManager);

// Initialize user manager and start scheduler
await userManager.loadProfiles();
scheduler.start();


interface CreateUserRequest {
    name: string;
    email: string;
    location: string;
    password?: string;
    availability?: string;
    interests?: Array<{ interest: string; weight: number }>;
    getEvents?: boolean;
    goals?: string[];
    context?: string;
}

interface AddEventSourceRequest {
    userId: string;
    url: string;
    type: string;
    selectors?: {
        title?: string;
        description?: string;
        datetime?: string;
        location?: string;
    };
}

async function handleCreateUser(body: CreateUserRequest): Promise<UserProfile> {
    if (!body.name || typeof body.name !== 'string') {
        throw new Error('Name is required and must be a string');
    }
    if (!body.email || typeof body.email !== 'string') {
        throw new Error('Email is required and must be a string');
    }
    if (!body.location || typeof body.location !== 'string') {
        throw new Error('Location is required and must be a string');
    }

    try {
        if (!body.password) {
            throw new Error('Password is required');
        }
        
            const profile = await userManager.createUserProfile({
                name: body.name,
                email: body.email,
                location: body.location,
                availability: body.availability || 'anytime', // Set default if not provided
                password: body.password
            });

        if (body.interests) {
            for (const { interest, weight } of body.interests) {
                await userManager.addInterest(profile.id, interest, weight);
            }
        }

        return profile;
    } catch (error) {
        console.error('Error creating user:', error);
        throw new Error('Failed to create user profile');
    }
}

async function handleGetSuggestions(userProfile: UserProfile, body: { 
    startDate?: string; 
    endDate?: string;
    goals?: string[];
    context?: string;
}): Promise<SerendipityOutput> {
    if (!userProfile) {
        throw new Error('User profile not found');
    }

    try {
        const input: SerendipityInput = {
            userProfile,
            goals: body.goals,
            timeframe: body.startDate && body.endDate ? {
                start: body.startDate,
                end: body.endDate
            } : undefined
        };

        const output = await serendipityAgent.predict(input);
        return output;
    } catch (error) {
        console.error('Error getting suggestions:', error);
        throw new Error('Failed to get suggestions');
    }
}

async function handleAddEventSource(userProfile: UserProfile, body: AddEventSourceRequest): Promise<void> {
    if (!userProfile) {
        throw new Error('User profile not found');
    }
    if (!body.url || typeof body.url !== 'string') {
        throw new Error('URL is required and must be a string');
    }
    if (!body.type || typeof body.type !== 'string') {
        throw new Error('Type is required and must be a string');
    }

    try {
        await userManager.addEventSource(userProfile.id, {
            url: body.url,
            type: body.type,
            selectors: body.selectors
        });
    } catch (error) {
        console.error('Error adding event source:', error);
        throw new Error('Failed to add event source');
    }
}

async function handler(method: string, path: string, body: Record<string, unknown> = {}, req?: Request): Promise<{ statusCode: number; body: Record<string, unknown> }> {
    try {
        if (method === 'GET' && path === '/') {
            return {
                statusCode: 200,
                body: {
                    api: {
                        endpoints: {
                            '/': {
                                POST: {
                                    description: 'Create a new user and get serendipitous suggestions',
                                    body: {
                                        name: 'string (required)',
                                        email: 'string (required)',
                                        location: 'string (required)',
                                        availability: 'string (optional)',
                                        interests: 'Array<{interest: string, weight: number}> (optional)',
                                        goals: 'string[] (optional)',
                                        context: 'string (optional)'
                                    }
                                }
                            },
                            '/add-source': {
                                POST: {
                                    description: 'Add an event source to a user profile',
                                    body: {
                                        userId: 'string (required)',
                                        url: 'string (required)',
                                        type: 'string (required)',
                                        selectors: {
                                            title: 'string (optional)',
                                            description: 'string (optional)',
                                            datetime: 'string (optional)',
                                            location: 'string (optional)'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };
        }

        // Public endpoints
        if (method === 'POST' && path === '/login') {
            const { email, password } = body as { email?: string; password?: string };
            if (!email || !password) {
                return {
                    statusCode: 400,
                    body: { error: 'Email and password are required' }
                };
            }

            // Find user by email
            const user = Object.values(userManager.getUserProfiles()).find((p: UserProfile) => p.email === email);
            if (!user || !user.passwordHash) {
                return {
                    statusCode: 401,
                    body: { error: 'Invalid credentials' }
                };
            }

            // Verify password
            const hashedPassword = await hashPassword(password);
            console.log('Login attempt:', {
                providedEmail: email,
                userFound: !!user,
                hashedPassword,
                storedHash: user.passwordHash,
                matches: hashedPassword === user.passwordHash
            });
            if (hashedPassword !== user.passwordHash) {
                return {
                    statusCode: 401,
                    body: { error: 'Invalid credentials' }
                };
            }

            // Generate JWT
            const token = await generateToken(user.id);
            return {
                statusCode: 200,
                body: { token, userId: user.id }
            };
        }

        // Protected endpoints
        if (path !== '/' && path !== '/login') {
            if (!req) {
                return {
                    statusCode: 401,
                    body: { error: 'Authentication required' }
                };
            }

            const auth = await authMiddleware(req);
            if (auth.error || !auth.userId) {
                return {
                    statusCode: 401,
                    body: { error: auth.error || 'Authentication required' }
                };
            }

            // For /add-source, validate that the authenticated user matches the requested userId
            if (path === '/add-source' && body.userId !== auth.userId) {
                return {
                    statusCode: 403,
                    body: { error: 'Not authorized to modify this user' }
                };
            }
        }

        if (method === 'POST' && path === '/') {
            // Validate required fields before casting
            if (typeof body.name !== 'string' || typeof body.email !== 'string' || typeof body.location !== 'string') {
                return {
                    statusCode: 400,
                    body: { error: 'name, email, and location are required and must be strings' }
                };
            }
            const profile = await handleCreateUser(body as unknown as CreateUserRequest);
            const token = await generateToken(profile.id);
            const response: Record<string, unknown> = { profile, token };

            if (body.getEvents || body.goals || body.context) {
                const suggestions = await handleGetSuggestions(profile, body);
                response.suggestions = suggestions.suggestions;
            }

            return {
                statusCode: 201,
                body: response
            };
        }

        if (method === 'POST' && path === '/add-source') {
            const userId = body.userId as string;
            if (!userId) {
                return {
                    statusCode: 400,
                    body: { error: 'userId is required' }
                };
            }
            const profile = userManager.getUserProfile(userId);
            if (!profile) {
                return {
                    statusCode: 404,
                    body: { error: 'User not found' }
                };
            }

            // Validate required fields before casting
            if (typeof body.url !== 'string' || typeof body.type !== 'string') {
                return {
                    statusCode: 400,
                    body: { error: 'url and type are required and must be strings' }
                };
            }
            await handleAddEventSource(profile, body as unknown as AddEventSourceRequest);
            const url = body.url as string;
            const eventSource = await userManager.getEventSource(profile.id, url);
            
            // Get suggestions after adding the source
            const suggestions = await handleGetSuggestions(profile, {});
            
            return {
                statusCode: 200,
                body: {
                    eventSource: eventSource || { error: 'Event source not found after adding' },
                    suggestions: suggestions.suggestions
                }
            };
        }

        return {
            statusCode: 404,
            body: { error: 'Not found' }
        };
    } catch (error: unknown) {
        console.error('Handler error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return {
            statusCode: errorMessage.includes('not found') ? 404 : 400,
            body: { error: errorMessage }
        };
    }
}

export { handler };
export type { CreateUserRequest, AddEventSourceRequest };

// CLI and HTTP deployment modes
if (import.meta.main) {
    const args = Deno.args;
    if (args[0] === "cli") {
        // CLI mode
        const userId = args[1];
        const goals = args[2]?.split(",") || [];
        
        if (!userId) {
            console.error("Usage: deno run main.ts cli <userId> [goals]");
            Deno.exit(1);
        }

        const profile = userManager.getUserProfile(userId);
        if (!profile) {
            console.error("User profile not found");
            Deno.exit(1);
        }

        try {
            const result = await serendipityAgent.predict({ 
                userProfile: profile, // No type assertion needed since null check ensures it's UserProfile
                goals: goals
            });
            console.log(JSON.stringify(result, null, 2));
        } catch (error) {
            console.error("Error getting suggestions:", error);
            Deno.exit(1);
        }
    } else {
        // HTTP and WebSocket mode
        const port = parseInt(Deno.env.get("PORT") || "8000");
        Deno.serve({ port }, async (req: Request) => {
            // Handle WebSocket upgrade
            if (req.headers.get("upgrade") === "websocket") {
                const url = new URL(req.url);
                const userId = url.searchParams.get("userId");
                const token = url.searchParams.get("token");

                if (!userId || !token) {
                    return new Response("Missing userId or token", { status: 400 });
                }

                // Verify token
                const validUserId = await verifyToken(token);
                if (!validUserId || validUserId !== userId) {
                    return new Response("Invalid token", { status: 401 });
                }

                const { socket, response } = Deno.upgradeWebSocket(req);
                scheduler.addConnection(userId, socket);
                return response;
            }

            const { method, url } = req;
            const path = new URL(url).pathname;

            // Serve index.html for root path
            if (method === "GET" && (path === "/" || path === "/index.html")) {
                return serveStaticFile("/index.html");
            }

            // Handle API requests
            const body = method === "GET" ? {} : await req.json();
            const response = await handler(method, path, body, req);
            return new Response(JSON.stringify(response.body), {
                status: response.statusCode,
                headers: { "Content-Type": "application/json" }
            });
        });
    }
}

// Serve static files
async function serveStaticFile(path: string): Promise<Response> {
    try {
        const file = await Deno.readFile(`src/static${path}`);
        const contentType = path.endsWith('.html') ? 'text/html' :
                          path.endsWith('.js') ? 'text/javascript' :
                          path.endsWith('.css') ? 'text/css' :
                          'application/octet-stream';
        
        return new Response(file, {
            headers: { "Content-Type": contentType }
        });
    } catch {
        return new Response('Not found', { status: 404 });
    }
}
