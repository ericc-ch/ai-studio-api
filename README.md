# AI Studio API

## Handling Messages

Since Google AI Studio doesn't allow us to prefill assistant messages, there are 2 ways to do this

- Use the "correct" way. We can do this by editing the studio file inside google drive. But it requires some sort of authentication or another google drive automation using playwright. Also latency is going to increase since we need to update the file in google drive first.
- Use a hacky way. We can instead use a prompting technique that condenses down all of the message history and asks the LLM to answer as if it's continuing the conversation. This is faster and easier to implement.

For now the second option is the only available implementation.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/E1E519XS7W)

## Project Overview

A server that exposes Google AI Studio as an OpenAI compatible API. It achieves this by automating a web browser to interact with the Google AI Studio interface. This allows you to use Google AI Studio with tools that expect an OpenAI-compatible interface.

## Prerequisites

- Bun (>= 1.2.x)

## Installation

To install dependencies, run:

```sh
bun install
```

## Using with docker

Build image

```sh
docker build -t ai-studio-api .
```

Run the container

```sh
docker run -p 4141:4141 ai-studio-api
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

- Enable the `--manual` flag to review and approve each request before processing.

### Manual Request Approval

When using the `--manual` flag, the server will prompt you to approve each incoming request

This helps you control usage and monitor requests in real-time.
