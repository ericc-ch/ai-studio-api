# AI Studio API

## Handling Messages

Since Google AI Studio doesn't allow us to prefill assistant messages, there are 2 ways to do this

- Use the "correct" way. We can do this by editing the studio file inside Google Drive. But it requires some sort of authentication or another Google Drive automation using Playwright. Also, latency is going to increase since we need to update the file in Google Drive first.
- Use a hacky way. We can instead use a prompting technique that condenses down all of the message history and asks the LLM to answer as if it's continuing the conversation. This is faster and easier to implement.

For now the second option is the only available implementation.

### Prompt Building

The prompt is constructed from three main parts:

1.  **Base Instructions**: A static preamble that instructs the AI on its role and response format. It specifies that the AI should act as an assistant continuing a conversation and that its output must be only the message content, without any prefixes like "ASSISTANT:".

2.  **Tool Instructions** (if applicable): If the request includes tools, a section is added that explains how the AI can use them. It provides a required JSON format for tool calls and lists the available tools with their names, descriptions, and parameters.

3.  **Chat History**: The entire conversation history (from system, user, and assistant messages) is formatted into a plain text block. Each message is prefixed with its role in uppercase (e.g., `USER:`, `ASSISTANT:`).

This combined prompt provides the model with all the necessary context in one go, allowing it to generate a contextually appropriate response as if it were participating in an ongoing chat.

## Project Overview

A server that exposes Google AI Studio as an OpenAI compatible API. It achieves this by automating a web browser (via Playwright) to interact with the Google AI Studio interface.

This can also be particularly useful for debugging prompts, as you can see the full conversation history in Google AI Studio.

## How it Works

The server operates by launching a browser instance (non-headless) controlled by Playwright. When an API request is received (e.g., for a chat completion), the server translates this request into a series of automated actions within the Google AI Studio web interface. These actions are:

- Navigating to the AI Studio chat new prompt page.
- Selecting the specified model.
- Adjusting parameters like temperature.
- Inputting the user's prompt into the designated text area.
- Triggering the submission of the prompt.
- Waiting for Google AI Studio to generate a response.
- Extracting the generated text content from the web page, by using the "copy" action.
- To handle multiple incoming requests sequentially and manage interactions with the single browser instance, the server utilizes a request queue. New API requests are added to this queue and processed one at a time.

The server then formats this extracted response to match the OpenAI API specification (e.g., for chat completions or streaming chunks) and returns it to the client. This entire process programmatically mimics how a human user would interact with AI Studio, effectively creating an API wrapper around the web UI.

## API Endpoints

The server exposes the following OpenAI-compatible endpoints:

- `GET /`: A simple health check endpoint that returns "Server running".
- `GET /models` and `GET /v1/models`: Lists the available models from Google AI Studio.
- `POST /chat/completions` and `POST /v1/chat/completions`: Creates a chat completion. This endpoint supports both streaming and non-streaming responses.

## Prerequisites

- Bun (>= 1.2.x)

## Installation

First, ensure you have the project code on your local machine (e.g., by cloning the repository).
Then, to install dependencies, run in the project's root directory:

```sh
bun install
```

## Command Line Options

The following command line options are available:

| Option       | Description                                  | Default | Alias |
| ------------ | -------------------------------------------- | ------- | ----- |
| --port       | Port to listen on                            | 4141    | -p    |
| --verbose    | Enable verbose logging                       | false   | -v    |
| --manual     | Enable manual request approval               | false   | none  |
| --rate-limit | Rate limit in seconds between requests       | none    | -r    |
| --wait       | Wait instead of error when rate limit is hit | false   | -w    |

Example usage:

```sh
# Run on custom port with verbose logging
bun run dev --port 8080 --verbose

# Enable manual approval for each request
bun run dev --manual

# Set rate limit to 30 seconds between requests
bun run dev --rate-limit 30

# Wait instead of error when rate limit is hit
bun run dev --rate-limit 30 --wait
```

## Running from Source

The project can be run from source in several ways:

### Development Mode

```sh
bun run dev
```

### Production Mode

```sh
bun run start
```

## Usage Tips

- **Manual Request Approval (`--manual`):**
  Enable the `--manual` flag to have the server prompt you in the console before processing each incoming API request. You'll be asked to type 'y' (yes) to approve or 'n' (no) to reject the request.
- **Rate Limiting (`--rate-limit` and `--wait`):**

  - Use the `--rate-limit <seconds>` option to specify a minimum time interval (in seconds) between consecutive requests to Google AI Studio. This helps prevent overwhelming the AI Studio interface or hitting unofficial usage limits.
  - If you also enable the `--wait` flag, requests that arrive faster than the specified rate limit will be queued and processed sequentially after the necessary delay.
  - If `--wait` is not enabled (the default), requests exceeding the rate limit will be immediately rejected with an error. This is useful if you prefer to handle backpressure on the client side.

- **Verbose Logging (`--verbose` or `-v`):**
  Use this flag to get more detailed output from the server, which can be helpful for troubleshooting or understanding the server's internal operations.

## Limitations

- **UI Dependency:** The project's functionality is tightly coupled to the Google AI Studio web interface. Any significant changes to the AI Studio UI by Google could potentially break the automation and require updates to this server.
- **Performance:** Browser automation inherently introduces more latency compared to direct API interactions. Expect responses to be slower than native API calls.
- **Session Management:** Relies on an active, logged-in session to Google AI Studio in the automated browser. Session expiry or login issues might disrupt service.
- **Single Instance Operation:** Designed to run as a single server instance managing one browser session. Concurrent requests would break the thing entirely.

## Support the Project

If you find this project useful, consider supporting its development:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E519XS7W)
