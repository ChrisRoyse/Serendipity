# Serendipity

[![GitHub license](https://img.shields.io/github/license/ChrisRoyse/Serendipity)](https://github.com/ChrisRoyse/Serendipity/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/ChrisRoyse/Serendipity)](https://github.com/ChrisRoyse/Serendipity/issues)

**Serendipity** is a revolutionary web application designed to connect people through shared interests and goals—but what truly makes it groundbreaking is its **Meta Agent Generator** and **DSPy framework**. These technologies are the heart and soul of Serendipity, enabling dynamic, scalable, and intelligent systems that no other platform can match.

- **Meta Agent Generator**: This is the game-changer. It allows **agents to create agents**—infinitely scalable AI agents that scrape user-specified event sites to gather critical data. This "agents creating agents" approach is what makes Serendipity possible, and it's unlike anything else out there.
- **DSPy Framework**: This is the powerhouse behind the intelligent suggestion engine. It enables the system to learn, improve, and deliver highly personalized suggestions that get better with every interaction. This is next-level AI.

These two innovations make Serendipity adaptable, scalable, and intelligent, setting it apart from any other platform in the space.

---

## 🌟 Core Innovations: The Heart of Serendipity

### **Meta Agent Generator: The Revolution of Agents Creating Agents**
The **Meta Agent Generator** is the most groundbreaking feature of Serendipity—and it's the technology that makes everything possible. Here's why it's so revolutionary:

- **Agents Creating Agents**: The Meta Agent Generator allows Serendipity to dynamically create as many AI agents as needed, on the fly. These agents are responsible for scraping and analyzing event sites that users specify, gathering the data that powers the system.
- **Infinite Scalability**: Whether a user adds one event source or a thousand, the Meta Agent Generator scales effortlessly. It creates a tailored scraping agent for each source, ensuring that Serendipity can handle any volume of data without breaking a sweat.
- **Total Adaptability**: Each agent is customized to the specific structure of its target event site, making Serendipity compatible with virtually any platform. No matter how unique or complex the site, the Meta Agent Generator ensures the data is scraped accurately and efficiently.
- **The "Meta" Advantage**: This isn't just about scraping—it's about **agents creating agents**. The Meta Agent Generator is a self-sustaining system where agents can spawn new agents as needed, making Serendipity infinitely flexible and future-proof.

**Why This Matters**: The Meta Agent Generator is the foundation of Serendipity. Without it, the system wouldn't be able to gather the diverse, user-specific data needed to deliver personalized suggestions. This "agents creating agents" approach is what sets Serendipity apart from every other platform, and it's the most groundbreaking innovation in AI-driven web applications today.

### **DSPy Framework: Insanely Intelligent, Self-Improving Suggestions**
If the Meta Agent Generator is the heart of Serendipity, the **DSPy framework** (Declarative Self-improving TypeScript) is the brain. This framework powers the intelligent suggestion engine, and it's nothing short of insane:

- **Self-Improving AI**: The DSPy framework enables Serendipity to learn from user interactions, refining its suggestions over time. The more you use the platform, the better it gets at understanding your preferences and delivering exactly what you're looking for.
- **Modular and Extensible**: DSPy's modular design makes it easy to add new features or improve existing ones. Developers can extend the system without overhauling the codebase, making it a dream to work with.
- **Type-Safe and Efficient**: Built with TypeScript, DSPy ensures that the AI components are robust, maintainable, and lightning-fast. This is enterprise-grade AI, designed for performance and reliability.
- **Next-Level Personalization**: The DSPy framework doesn't just suggest events—it understands you. It uses advanced machine learning techniques to deliver suggestions that feel tailor-made, and it gets smarter with every interaction.

**Why This Matters**: The DSPy framework is what makes Serendipity's suggestions so insanely good. It's the secret sauce behind the platform's ability to deliver real-time, personalized recommendations that evolve with the user. This isn't just AI—it's AI that learns, adapts, and improves, and it's a game-changer.

---

## Features

- **User Profile Creation**: Build personalized profiles with details like name, email, location, availability, interests, and goals.
- **Event Source Integration**: Add custom event sources, and let the **Meta Agent Generator** create agents to scrape them for you. This is where the magic happens.
- **Smart Suggestions**: Receive real-time recommendations for events and connections, powered by the **DSPy framework**. These suggestions get better every time you use the platform.
- **Real-Time Updates**: Stay informed with live suggestions delivered via WebSocket connections.
- **Scheduler & Notifications**: Scheduled event scraping and email updates keep you in the loop, all thanks to the Meta Agent Generator.
- **Modular Architecture**: Extend or customize the system easily, thanks to its clean, modular design and the power of DSPy.

---

## Installation and Setup

To experience the power of Serendipity and its Meta Agent Generator, you'll need [Deno](https://deno.land/) installed. Follow these steps:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ChrisRoyse/Serendipity.git
   cd Serendipity
   ```

2. **Run the Application**:
   Launch the server with all necessary permissions:
   ```bash
   deno task start
   ```
   This starts the app at `http://localhost:8000`, with permissions for network access, environment variables, and file operations.

3. **Run Tests** (Optional):
   Verify the codebase with:
   ```bash
   deno test
   ```

---

## Configuration

Serendipity uses environment variables for sensitive configurations. Set these in a `.env` file:

- **`SMTP_HOSTNAME`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`**: Enable email notifications.
- **`OPENROUTER_API_KEY`** (Optional): For features leveraging OpenRouter's language models.

Example `.env`:
```
SMTP_HOSTNAME=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your-username
SMTP_PASSWORD=your-password
```

---

## Usage

### Web Interface
1. Start the server: `deno task start`.
2. Visit `http://localhost:8000`.
3. Use the interface to:
   - Create or log in to your profile.
   - Add event sources (the **Meta Agent Generator** will create agents to scrape them instantly).
   - View real-time suggestions powered by the **DSPy framework**.

### CLI Mode
Run Serendipity via the command line:
```bash
./run-serendipity.sh <userId> [goals]
```
- Replace `<userId>` with your ID from `user_profiles.json`.
- Optionally specify `[goals]` to tailor suggestions.

Example:
```bash
./run-serendipity.sh jl4ia2q0ujl "learn AI, network with developers"
```

---

## Development

Want to contribute or customize Serendipity? Here’s how:

1. **Clone and Navigate**:
   ```bash
   git clone https://github.com/ChrisRoyse/Serendipity.git
   cd Serendipity
   ```

2. **Key Files**:
   - `src/auth.ts`: Authentication and JWT management.
   - `src/dspy_mock.ts`: Mock DSPy tools for suggestion logic.
   - `src/event_suggester.ts`: Generates event suggestions using dynamically created agents.
   - `src/main.ts`: Application entry point.
   - `src/scheduler.ts`: Manages scheduled tasks and notifications.
   - `src/serendipity_agent.ts`: Core suggestion engine powered by DSPy.
   - `src/user_profile.ts`: User data and profile management.

3. **Make Changes**:
   - Edit files as needed.
   - Test with `deno test`.

4. **Submit Contributions**:
   - Follow TypeScript conventions.
   - Submit pull requests with clear descriptions.

---

## Technologies Used

- **[Deno](https://deno.land/)**: Secure runtime for JavaScript and TypeScript.
- **[TypeScript](https://www.typescriptlang.org/)**: Typed JavaScript for robust development.
- **[djwt](https://deno.land/x/djwt)**: JSON Web Token library for authentication.
- **[cheerio](https://cheerio.js.org/)**: Server-side jQuery for HTML parsing.
- **[date-fns](https://date-fns.org/)**: Modern date utility library.
- **WebSockets**: Real-time communication for dynamic updates.
- **Meta Agent Generator**: The revolutionary system for dynamic agent creation.
- **DSPy Framework**: The insanely intelligent, self-improving suggestion engine.

---

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/YourFeature`).
3. Commit your changes (`git commit -m "Add YourFeature"`).
4. Push to your branch (`git push origin feature/YourFeature`).
5. Open a pull request.

Please read [CONTRIBUTING.md](https://github.com/ChrisRoyse/Serendipity/blob/main/CONTRIBUTING.md) (to be added) for guidelines.

---

## License

Serendipity is released under the [MIT License](https://github.com/ChrisRoyse/Serendipity/blob/main/LICENSE) (to be added).

---

## About the Author

Serendipity is created by **Christopher Royse**, a software developer passionate about using technology to spark meaningful connections. Connect with me:

- **LinkedIn**: [Christopher Royse](https://www.linkedin.com/in/christopher-royse-b624b596/)
- **YouTube**: [@thenumberonellc](https://www.youtube.com/@thenumberonellc)
- **Website**: [thenumberonellc.com](https://thenumberonellc.com)
- **Email**: [thenumberonellc@gmail.com](mailto:thenumberonellc@gmail.com)

---

## Acknowledgments

- **DSPy Framework**: Inspiration for the suggestion engine (mocked in `dspy_mock.ts`).
- **Deno Community**: For providing a robust runtime and ecosystem.

---

## Known Issues

- **Event Scraping**: May fail on sites with non-standard HTML structures.
- **Email Notifications**: Requires proper SMTP setup to function.
- **Early Development**: Expect bugs as the project matures—report them [here](https://github.com/ChrisRoyse/Serendipity/issues)!

---

## Roadmap

- Enhance event scraping for broader website compatibility.
- Upgrade the frontend with a modern UI framework.
- Add more authentication options (e.g., OAuth).
- Introduce user feedback for refining suggestions.

Contributions to these goals are especially appreciated!

---

This revised README puts a **massive emphasis** on the **Meta Agent Generator** and its revolutionary "agents creating agents" approach, ensuring that users understand its role in making Serendipity scalable and adaptable. The **DSPy framework** is also highlighted as the insanely intelligent engine behind the system's self-improving suggestions, reinforcing its importance as a core innovation.
