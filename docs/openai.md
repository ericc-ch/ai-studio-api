# Create Chat Completion

Creates a model response for the given chat conversation.

**Endpoint:** `POST /v1/chat/completions`

### Summary

This endpoint generates a model response for a given conversation. It is a highly flexible endpoint that supports text generation, vision capabilities, and function calling.

**Recommendation:** For new projects, it is recommended to use the [Responses API](/docs/api-reference/responses) to leverage the latest platform features. You can find a comparison here: [Chat Completions vs. Responses](/docs/guides/responses-vs-chat-completions?api-mode=responses).

---

## Request Body

The request body must be a JSON object with the following parameters:

| Parameter           | Type             | Required | Description                                                                                                                                                                                                                                            |
| ------------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `messages`          | array            | Yes      | A list of messages comprising the conversation so far. See the [Message Object](#the-message-object) section below.                                                                                                                                    |
| `model`             | string           | Yes      | ID of the model to use. See the [model overview](/docs/models) for available models.                                                                                                                                                                   |
| `frequency_penalty` | number           | No       | Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim. Defaults to 0.                                              |
| `logit_bias`        | map              | No       | A map to modify the likelihood of specified tokens appearing in the completion. Accepts a JSON object that maps token IDs (as keys) to an associated bias value from -100 to 100.                                                                      |
| `logprobs`          | boolean          | No       | Whether to return log probabilities of the output tokens. If true, returns the log probabilities of each output token in the `content` of `message`. Defaults to `false`.                                                                              |
| `max_tokens`        | integer          | No       | The maximum number of tokens to generate in the chat completion. The total length of input tokens and generated tokens is limited by the model's context length. **(Deprecated in favor of `max_completion_tokens` on newer models)**                  |
| `n`                 | integer          | No       | How many chat completion choices to generate for each input message. Defaults to 1.                                                                                                                                                                    |
| `presence_penalty`  | number           | No       | Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics. Defaults to 0.                                                           |
| `response_format`   | object           | No       | An object specifying the format that the model must output. For example, `{"type": "json_object"}`.                                                                                                                                                    |
| `seed`              | integer          | No       | (Beta) If specified, the system will make a best effort to sample deterministically.                                                                                                                                                                   |
| `stop`              | string or array  | No       | Up to 4 sequences where the API will stop generating further tokens.                                                                                                                                                                                   |
| `stream`            | boolean          | No       | If set, partial message deltas will be sent, like in ChatGPT. Tokens will be sent as data-only server-sent events as they become available. Defaults to `false`.                                                                                       |
| `temperature`       | number           | No       | What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. Defaults to 1.                                                    |
| `top_p`             | number           | No       | An alternative to sampling with temperature, called nucleus sampling. The model considers the results of the tokens with `top_p` probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. Defaults to 1. |
| `tools`             | array            | No       | A list of tools the model may call. See the [Tool Object](#the-tool-object) section below.                                                                                                                                                             |
| `tool_choice`       | string or object | No       | Controls which, if any, tool is called by the model. Can be `none`, `auto`, `required`, or specify a particular function like `{"type": "function", "function": {"name": "my_function"}}`.                                                             |
| `user`              | string           | No       | A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse.                                                                                                                                                     |

---

### The Message Object

The `messages` array consists of message objects, where each object has a `role` and `content`.

| Parameter      | Type            | Required | Description                                                                                            |
| -------------- | --------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `role`         | string          | Yes      | The role of the author of this message. Can be `developer`, `system`, `user`, `assistant`, or `tool`.  |
| `content`      | string or array | Yes      | The contents of the message. This can be a string or an array of content parts (for multimodal input). |
| `name`         | string          | No       | An optional name for the participant, providing differentiation for participants of the same role.     |
| `tool_calls`   | array           | No       | The tool calls generated by the model, if any.                                                         |
| `tool_call_id` | string          | No       | The ID of the tool call that this message is responding to. (Required if `role` is `tool`).            |

#### User Message Content Parts (Multimodal)

When the `content` of a `user` message is an array, it can contain a mix of text and image parts.

| Type        | Description                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `text`      | A text part, containing the string of text.                                                                             |
| `image_url` | An image part, containing a URL or base64-encoded image data and an optional `detail` level (`low`, `high`, or `auto`). |

### The Tool Object

The `tools` array allows you to define functions the model can call.

| Parameter  | Type   | Required | Description                                                |
| ---------- | ------ | -------- | ---------------------------------------------------------- |
| `type`     | string | Yes      | The type of tool. Currently, only `function` is supported. |
| `function` | object | Yes      | An object defining the function. See below.                |

#### The Function Object

| Parameter     | Type   | Required | Description                                                                                                                   |
| ------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `name`        | string | Yes      | The name of the function to be called. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with a maximum length of 64. |
| `description` | string | No       | A description of what the function does, used by the model to decide when to call it.                                         |
| `parameters`  | object | No       | The parameters the function accepts, described as a JSON Schema object.                                                       |

---

## Responses

### Successful Response (200 OK)

A successful non-streaming request returns a JSON object with the following structure.

| Parameter            | Type    | Description                                                                             |
| -------------------- | ------- | --------------------------------------------------------------------------------------- |
| `id`                 | string  | A unique identifier for the chat completion.                                            |
| `object`             | string  | The object type, which is always `chat.completion`.                                     |
| `created`            | integer | The Unix timestamp (in seconds) of when the completion was created.                     |
| `model`              | string  | The model used for the chat completion.                                                 |
| `choices`            | array   | A list of chat completion choices. See [The Choice Object](#the-choice-object).         |
| `usage`              | object  | Usage statistics for the completion request. See [The Usage Object](#the-usage-object). |
| `system_fingerprint` | string  | This fingerprint represents the backend configuration that the model runs with.         |

#### The Choice Object

| Parameter       | Type    | Description                                                                                                 |
| --------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `index`         | integer | The index of the choice in the list of choices.                                                             |
| `message`       | object  | A message object containing the generated response. See below.                                              |
| `finish_reason` | string  | The reason the model stopped generating tokens. Can be `stop`, `length`, `tool_calls`, or `content_filter`. |
| `logprobs`      | object  | Log probability information for the choice. Null if `logprobs` was not requested.                           |

#### The Response Message Object

| Parameter    | Type   | Description                                                                                                                                            |
| ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `role`       | string | The role of the author, which will be `assistant`.                                                                                                     |
| `content`    | string | The text content of the message. Can be null if `tool_calls` are present.                                                                              |
| `tool_calls` | array  | The tool calls generated by the model, if any. Each object contains an `id`, `type` ('function'), and a `function` object with `name` and `arguments`. |

#### The Usage Object

| Parameter           | Type    | Description                                   |
| ------------------- | ------- | --------------------------------------------- |
| `prompt_tokens`     | integer | Number of tokens in the prompt.               |
| `completion_tokens` | integer | Number of tokens in the generated completion. |
| `total_tokens`      | integer | Total number of tokens used in the request.   |

### Streaming Response (200 OK)

If `stream: true` is set, the API streams back a sequence of server-sent events.

Each event is a JSON object representing a `chat.completion.chunk`.

#### The Chat Completion Chunk Object

| Parameter | Type    | Description                                                              |
| --------- | ------- | ------------------------------------------------------------------------ |
| `id`      | string  | A unique identifier for the chat completion. Each chunk has the same ID. |
| `object`  | string  | The object type, which is always `chat.completion.chunk`.                |
| `created` | integer | The Unix timestamp of when the completion was created.                   |
| `model`   | string  | The model used for the completion.                                       |
| `choices` | array   | A list of choices, where each choice contains a `delta` object.          |

#### The Delta Object

The `delta` object contains the fields that have changed. It can include:

- `role`: The role of the message author.
- `content`: A partial string of the message content.
- `tool_calls`: A partial list of tool calls, including the function `name` and partial `arguments`.

The stream is terminated by a `data: [DONE]` message.

---

# Models

List and describe the various models available in the API.

## List Models

Lists the currently available models, and provides basic information about each one such as the owner and availability.

**Endpoint:** `GET /models`

### Response Body

A successful request returns a list of model objects.

| Parameter | Type   | Description                              |
| --------- | ------ | ---------------------------------------- |
| `object`  | string | The object type, which is always "list". |
| `data`    | array  | A list of model objects.                 |

#### The Model Object

| Parameter  | Type    | Description                                                     |
| ---------- | ------- | --------------------------------------------------------------- |
| `id`       | string  | The model identifier, which can be referenced in API endpoints. |
| `object`   | string  | The object type, which is always "model".                       |
| `created`  | integer | The Unix timestamp (in seconds) when the model was created.     |
| `owned_by` | string  | The organization that owns the model.                           |

## Retrieve a Model

Retrieves a model instance, providing basic information about the model such as the owner and permissioning.

**Endpoint:** `GET /models/{model}`

### Path Parameters

| Parameter | Type   | Required | Description                                  |
| --------- | ------ | -------- | -------------------------------------------- |
| `model`   | string | Yes      | The ID of the model to use for this request. |

### Response Body

A successful request returns a single [Model Object](#the-model-object).
