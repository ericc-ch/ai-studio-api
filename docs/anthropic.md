# Claude API Reference

This document provides a condensed overview of the Anthropic Claude API, covering messages, token counting, and model management.

---

## Messages API

The Messages API is the primary way to interact with Claude for multi-turn conversations and single queries.

### Create a Message

Creates a model response for the given conversation.

**Endpoint:** `POST /v1/messages`

#### Request Body

The request body is a JSON object.

| Parameter        | Type            | Required | Description                                                                                                                                           |
| :--------------- | :-------------- | :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`          | string          | Yes      | The model that will complete your prompt. Example: `claude-3-7-sonnet-20250219`.                                                                      |
| `messages`       | array           | Yes      | A list of input messages comprising the conversation so far. See [The Message Object](https://www.google.com/search?q=%23the-message-object) below.   |
| `max_tokens`     | integer         | Yes      | The maximum number of tokens to generate. Different models have different maximum values for this parameter.                                          |
| `system`         | string or array | No       | A system prompt to provide context and instructions to Claude, such as specifying a role or goal.                                                     |
| `metadata`       | object          | No       | An object for metadata, such as a `user_id`, to help detect abuse. Do not include any personally identifying information.                             |
| `stop_sequences` | array           | No       | Custom text sequences that will cause the model to stop generating.                                                                                   |
| `stream`         | boolean         | No       | If set, the response will be incrementally streamed using server-sent events. Defaults to `false`.                                                    |
| `temperature`    | number          | No       | The amount of randomness injected into the response, ranging from `0.0` to `1.0`. Defaults to `1.0`.                                                  |
| `thinking`       | object          | No       | Configuration for enabling Claude's extended thinking process, which shows reasoning steps before the final answer.                                   |
| `top_p`          | number          | No       | Use nucleus sampling. The model considers tokens with `top_p` probability mass. You should alter `temperature` or `top_p`, but not both.              |
| `top_k`          | integer         | No       | Only sample from the top K options for each subsequent token. Recommended for advanced use cases only.                                                |
| `tools`          | array           | No       | A list of tools the model may use. See [The Tool Object](https://www.google.com/search?q=%23the-tool-object) below.                                   |
| `tool_choice`    | object          | No       | Controls how the model should use tools. Can be `{"type": "auto"}`, `{"type": "any"}`, `{"type": "tool", "name": "tool_name"}` or `{"type": "none"}`. |
| `service_tier`   | string          | No       | Can be set to `auto` or `standard_only` to determine whether to use priority capacity.                                                                |

#### The Message Object

The `messages` array consists of message objects, where each object has a `role` and `content`. Models are trained on alternating `user` and `assistant` conversational turns.

| Parameter | Type            | Required | Description                                                                                                 |
| :-------- | :-------------- | :------- | :---------------------------------------------------------------------------------------------------------- |
| `role`    | string          | Yes      | The role of the message author. Must be either `user` or `assistant`.                                       |
| `content` | string or array | Yes      | The content of the message. This can be a simple string or an array of content blocks for multimodal input. |

**Content Blocks:** For multimodal input, the `content` array can contain different types of blocks.

- **`text`**: A block with a `type` of "text" and a `text` field containing the string.
- **`image`**: Starting with Claude 3 models, you can send image content blocks. The `source` object must specify a `type` of "base64", a `media_type` (`image/jpeg`, `image/png`, `image/gif`, or `image/webp`), and the `data`.
- **`tool_result`**: A block used to return the output of a tool back to the model. It includes the `tool_use_id`, the `content` from the tool's execution, and an optional `is_error` flag.

#### The Tool Object

The `tools` array allows you to define client-side tools the model can call.

| Parameter      | Type   | Required | Description                                                                                                      |
| :------------- | :----- | :------- | :--------------------------------------------------------------------------------------------------------------- |
| `name`         | string | Yes      | The name of the tool, which must match the pattern `^[a-zA-Z0-9_-]{1,64}$`.                                      |
| `description`  | string | No       | A detailed, strongly-recommended description of what the tool does, which helps the model decide when to use it. |
| `input_schema` | object | Yes      | A [JSON Schema](https://json-schema.org/draft/2020-12) object describing the parameters the tool accepts.        |

#### Response (200 OK)

A successful **non-streaming** request returns a `Message` object.

| Parameter       | Type   | Description                                                                                                                               |
| :-------------- | :----- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | string | A unique identifier for the message object.                                                                                               |
| `type`          | string | The object type, which is always `message`.                                                                                               |
| `role`          | string | The role of the author, which is always `assistant`.                                                                                      |
| `content`       | array  | An array of content blocks generated by the model (e.g., `text` or `tool_use`).                                                           |
| `model`         | string | The model that handled the request.                                                                                                       |
| `stop_reason`   | string | The reason the model stopped generating tokens. Can be `end_turn`, `max_tokens`, `stop_sequence`, `tool_use`, `pause_turn`, or `refusal`. |
| `stop_sequence` | string | If the model was stopped by a custom stop sequence, this field will contain which sequence was generated. Can be null.                    |
| `usage`         | object | An object containing token usage statistics. See [The Usage Object](https://www.google.com/search?q=%23the-usage-object).                 |

#### Streaming Response (200 OK)

When `stream: true` is set, the API streams the response using server-sent events (SSE). Each event is named (e.g., `event: message_start`) and contains associated JSON data.

The event flow for a stream is as follows:

1.  `message_start`: Contains a `Message` object with empty `content`.
2.  A series of content blocks. Each block has a `content_block_start` event, one or more `content_block_delta` events, and a `content_block_stop` event. The `index` in these events corresponds to the content block's position in the final `content` array.
3.  One or more `message_delta` events, which indicate top-level changes to the final `Message` object. The `usage` field in this event contains cumulative token counts.
4.  A final `message_stop` event.

The stream may also include `ping` events to keep the connection alive and `error` events if issues occur.

##### Content Block Delta Types

Each `content_block_delta` event contains a `delta` object that updates a content block.

- **Text Delta**: Updates a `text` content block.

  ```json
  event: content_block_delta
  data: {"type": "content_block_delta","index": 0,"delta": {"type": "text_delta", "text": "ello frien"}}
  ```

- **Input JSON Delta**: Used for `tool_use` blocks, these deltas contain partial JSON strings for the tool's `input` field. The partial strings must be accumulated and parsed into a final JSON object upon receiving the `content_block_stop` event.

  ```json
  event: content_block_delta
  data: {"type": "content_block_delta","index": 1,"delta": {"type": "input_json_delta","partial_json": "{\"location\": \"San Fra"}}}
  ```

- **Thinking Delta**: When extended thinking is enabled, these deltas update the `thinking` field of a thinking content block. A special `signature_delta` event is sent just before the `content_block_stop` to verify the block's integrity.

  ```json
  event: content_block_delta
  data: {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "Let me solve this step by step:\n\n1. First break down 27 * 453"}}
  ```

#### The Usage Object

The `usage` object details billing and rate-limit token counts.

| Parameter                     | Type    | Description                                                                 |
| :---------------------------- | :------ | :-------------------------------------------------------------------------- |
| `input_tokens`                | integer | The number of input tokens used.                                            |
| `output_tokens`               | integer | The number of output tokens generated.                                      |
| `cache_creation_input_tokens` | integer | The number of input tokens used to create a cache entry.                    |
| `cache_read_input_tokens`     | integer | The number of input tokens read from the cache.                             |
| `service_tier`                | string  | The service tier used for the request (`standard`, `priority`, or `batch`). |

### Streaming Examples

#### Basic Streaming Request

```bash
curl https://api.anthropic.com/v1/messages \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --data \
'{
  "model": "claude-opus-4-20250514",
  "messages": [{"role": "user", "content": "Hello"}],
  "max_tokens": 256,
  "stream": true
}'
```

**Response:**

```json
event: message_start
data: {"type": "message_start", "message": {"id": "msg_1nZdL29xx5MUA1yADyHTEsnR8uuvGzszyY", "type": "message", "role": "assistant", "content": [], "model": "claude-opus-4-20250514", "stop_reason": null, "stop_sequence": null, "usage": {"input_tokens": 25, "output_tokens": 1}}}

event: content_block_start
data: {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}

event: ping
data: {"type": "ping"}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Hello"}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "!"}}

event: content_block_stop
data: {"type": "content_block_stop", "index": 0}

event: message_delta
data: {"type": "message_delta", "delta": {"stop_reason": "end_turn", "stop_sequence":null}, "usage": {"output_tokens": 15}}

event: message_stop
data: {"type": "message_stop"}
```

#### Streaming Request with Tool Use

```bash
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-opus-4-20250514",
    "max_tokens": 1024,
    "tools": [
      {
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "input_schema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "The city and state, e.g. San Francisco, CA"
            }
          },
          "required": ["location"]
        }
      }
    ],
    "tool_choice": {"type": "any"},
    "messages": [
      {
        "role": "user",
        "content": "What is the weather like in San Francisco?"
      }
    ],
    "stream": true
  }'
```

**Response:**

```json
event: message_start
data: {"type":"message_start","message":{"id":"msg_014p7gG3wDgGV9EUtLvnow3U","type":"message","role":"assistant","model":"claude-opus-4-20250514","stop_sequence":null,"usage":{"input_tokens":472,"output_tokens":2},"content":[],"stop_reason":null}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}

event: ping
data: {"type": "ping"}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Okay"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":","}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" let"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"'s"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" check"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" the"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" weather"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" for"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" San"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" Francisco"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":","}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" CA"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":":"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: content_block_start
data: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_01T1x1fJ34qAmk2tNTrN7Up6","name":"get_weather","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":""}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"location\":"}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":" \"San"}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":" Francisc"}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"o,"}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":" CA\""}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":", "}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"\"unit\": \"fah"}}

event: content_block_delta
data: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"renheit\"}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":1}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"tool_use","stop_sequence":null},"usage":{"output_tokens":89}}

event: message_stop
data: {"type":"message_stop"}
```

#### Streaming Request with Extended Thinking

```bash
curl https://api.anthropic.com/v1/messages \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --data \
'{
    "model": "claude-opus-4-20250514",
    "max_tokens": 20000,
    "stream": true,
    "thinking": {
        "type": "enabled",
        "budget_tokens": 16000
    },
    "messages": [
        {
            "role": "user",
            "content": "What is 27 * 453?"
        }
    ]
}'
```

**Response:**

```json
event: message_start
data: {"type": "message_start", "message": {"id": "msg_01...", "type": "message", "role": "assistant", "content": [], "model": "claude-opus-4-20250514", "stop_reason": null, "stop_sequence": null}}

event: content_block_start
data: {"type": "content_block_start", "index": 0, "content_block": {"type": "thinking", "thinking": ""}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "Let me solve this step by step:\n\n1. First break down 27 * 453"}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "\n2. 453 = 400 + 50 + 3"}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "\n3. 27 * 400 = 10,800"}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "\n4. 27 * 50 = 1,350"}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "\n5. 27 * 3 = 81"}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "\n6. 10,800 + 1,350 + 81 = 12,231"}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 0, "delta": {"type": "signature_delta", "signature": "EqQBCgIYAhIM1gbcDa9GJwZA2b3hGgxBdjrkzLoky3dl1pkiMOYds..."}}

event: content_block_stop
data: {"type": "content_block_stop", "index": 0}

event: content_block_start
data: {"type": "content_block_start", "index": 1, "content_block": {"type": "text", "text": ""}}

event: content_block_delta
data: {"type": "content_block_delta", "index": 1, "delta": {"type": "text_delta", "text": "27 * 453 = 12,231"}}

event: content_block_stop
data: {"type": "content_block_stop", "index": 1}

event: message_delta
data: {"type": "message_delta", "delta": {"stop_reason": "end_turn", "stop_sequence": null}}

event: message_stop
data: {"type": "message_stop"}
```

### Count Message Tokens

Calculates the number of tokens for a given set of messages without creating it.

**Endpoint:** `POST /v1/messages/count_tokens`

#### Request Body

The request accepts a subset of the "Create a Message" parameters.

| Parameter  | Type            | Required | Description                          |
| :--------- | :-------------- | :------- | :----------------------------------- |
| `model`    | string          | Yes      | The model that would be used.        |
| `messages` | array           | Yes      | A list of input messages.            |
| `system`   | string or array | No       | A system prompt.                     |
| `tools`    | array           | No       | A list of tools the model could use. |

#### Response (200 OK)

A successful request returns a JSON object.

| Parameter      | Type    | Description                                                                                |
| :------------- | :------ | :----------------------------------------------------------------------------------------- |
| `input_tokens` | integer | The total number of tokens across the provided list of messages, system prompt, and tools. |

---

## Models API

The Models API allows you to list and retrieve information about available models.

### List Models

Lists the currently available models, with the most recently released models appearing first.

**Endpoint:** `GET /v1/models`

#### Response (200 OK)

A successful request returns a list of model objects.

| Parameter  | Type    | Description                                                                     |
| :--------- | :------ | :------------------------------------------------------------------------------ |
| `data`     | array   | A list of [Model Objects](https://www.google.com/search?q=%23the-model-object). |
| `has_more` | boolean | Indicates if there are more results in the requested page direction.            |

### Get a Model

Retrieves a specific model instance by its ID or alias.

**Endpoint:** `GET /v1/models/{model_id}`

#### Response (200 OK)

A successful request returns a single [Model Object](https://www.google.com/search?q=%23the-model-object).

#### The Model Object

| Parameter      | Type   | Description                                                         |
| :------------- | :----- | :------------------------------------------------------------------ |
| `id`           | string | The unique model identifier. Example: `claude-3-7-sonnet-20250219`. |
| `type`         | string | The object type, which is always `model`.                           |
| `display_name` | string | A human-readable name for the model. Example: `Claude 3.7 Sonnet`.  |
| `created_at`   | string | An RFC 3339 datetime string of when the model was released.         |
