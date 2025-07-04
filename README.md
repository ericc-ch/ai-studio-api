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

To handle multiple incoming requests sequentially and manage interactions with the single browser instance, the server utilizes a request queue. New API requests are added to this queue and processed one at a time. A background process continuously checks the queue, processing tasks as they come in. If a rate limit is set, the server will wait for the specified duration between requests. If the queue is empty, the process sleeps with an exponential backoff strategy until new requests arrive. This ensures that browser interactions are serialized and respect any configured rate limits, preventing both conflicts from concurrent operations and potential issues with the backend service.

The server then formats this extracted response to match the OpenAI API specification (e.g., for chat completions or streaming chunks) and returns it to the client. This entire process programmatically mimics how a human user would interact with AI Studio, effectively creating an API wrapper around the web UI.

## Proxy Models

In addition to interacting with Google AI Studio through browser automation, this server can also act as a proxy to the official Gemini API. This is useful for accessing models that may not be available in the AI Studio UI or for getting faster, more reliable responses.

When you provide a Gemini API key using the `--gemini-api-key` command-line option, the server will list additional models prefixed with `proxy-` (e.g., `proxy-gemini-2.5-flash`). When you make a request using one of these proxy models, the server forwards the request directly to the Gemini API instead of processing it through the browser. This bypasses the browser automation entirely for that request.

## API Endpoints

The server exposes the following OpenAI-compatible endpoints:

- `GET /`: A simple health check endpoint that returns "Server running".
- `GET /models` and `GET /v1/models`: Lists the available models from Google AI Studio.
- `POST /chat/completions` and `POST /v1/chat/completions`: Creates a chat completion. This endpoint supports both streaming and non-streaming responses.

## Prerequisites

- Node.js
- Chromium based browser
- Google account

## Installation

First, ensure you have the project code on your local machine (e.g., by cloning the repository).
Then, to install dependencies, run in the project's root directory:

```sh
pnpm install
```

## Command Line Options

The following command line options are available:

| Option             | Description                                                                          | Default    | Alias |
| ------------------ | ------------------------------------------------------------------------------------ | ---------- | ----- |
| --port             | Port to listen on                                                                    | `4157`     | -p    |
| --verbose          | Enable verbose logging                                                               | false      | -v    |
| --manual           | Enable manual request approval                                                       | false      | none  |
| --json             | Use JSON mode in AI response, making it easier to parse                              | false      | -j    |
| --gemini-api-key   | Set Gemini API key for proxied requests                                              | none       | none  |
| --rate-limit       | Rate limit in seconds between requests                                               | none       | -r    |
| --claude-code      | Generate a command to launch Claude Code with the server config                      | false      | -c    |
| --wait             | Wait instead of error when rate limit is hit. Has no effect if rate limit is not set | false      | -w    |
| --browser-path     | Path to the browser executable                                                       | `chromium` | none  |
| --browser-delay    | Delay in ms after launching the browser                                              | `5000`     | none  |

Example usage:

```sh
# Run on custom port with verbose logging
pnpm run dev --port 8080 --verbose

# Enable manual approval for each request
pnpm run dev --manual

# Set rate limit to 30 seconds between requests
pnpm run dev --rate-limit 30

# Wait instead of error when rate limit is hit
pnpm run dev --rate-limit 30 --wait

# Use a Gemini API key to enable proxy models
pnpm run dev --gemini-api-key "YOUR_API_KEY"

# Use a different browser executable
pnpm run dev --browser-path /usr/bin/google-chrome

# Set a different browser launch delay
pnpm run dev --browser-delay 10000
```

## Running from Source

The project can be run from source in several ways:

### Development Mode

```sh
pnpm run dev
```

### Production Mode

```sh
pnpm run start
```

## Support the Project

If you find this project useful, consider supporting its development:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E519XS7W)
