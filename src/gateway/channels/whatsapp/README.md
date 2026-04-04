# WhatsApp Gateway

Chat with Sentinel through WhatsApp by linking your phone to the gateway. Messages you send to yourself (self-chat) are processed by Sentinel and responses are sent back to the same chat.

## Overview

```
WhatsApp ──→ Gateway ──→ Sentinel Agent ──→ Response ──→ WhatsApp
```

The gateway connects to WhatsApp Web using [Baileys](https://github.com/WhiskeySockets/Baileys), processes incoming messages through the Sentinel agent, and sends responses back. It supports:

- **Self-chat mode**: Message yourself to interact with Sentinel
- **Bot phone mode**: Dedicated phone number that others can message
- **Group chat support**: Responds to @-mentions in group chats

## Prerequisites

- Sentinel installed and working (see main [README](../../../../README.md))
- A WhatsApp account with phone number
- The phone must stay connected to the internet

## Setup

### 1. Link WhatsApp

Link your WhatsApp account to Sentinel by scanning a QR code:

```bash
bun run gateway:login
```

This will:
1. Display a QR code in your terminal
2. Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
3. Scan the QR code

After linking, you'll be asked how you want to use Sentinel:

#### Option 1: Self-chat mode (recommended for personal use)

Use your own WhatsApp to talk to Sentinel by messaging yourself. The linked phone number is added to `allowFrom` and self-chat mode is activated automatically.

#### Option 2: Bot phone mode

If Sentinel has its own phone number (e.g. a separate SIM), choose this option and enter the phone number(s) allowed to message it. The gateway will be configured with `dmPolicy: "allowlist"` so other people can DM the bot.

Credentials are saved to `.sentinel/credentials/whatsapp/default/`.

### 2. Start the Gateway

```bash
bun run gateway
```

Output:
```
Sentinel gateway running. Press Ctrl+C to stop.
```

The gateway will now listen for incoming WhatsApp messages and respond using Sentinel.

## Usage

### Sending Messages

1. Open WhatsApp on your phone
2. Go to your own chat (self-chat) or message the bot number
3. Type a financial question (e.g., "What's AAPL's revenue trend?")
4. You'll see a typing indicator while Sentinel processes
5. Sentinel's response will appear in the chat

Example:
```
You: What was NVIDIA's revenue last year?
Sentinel: NVIDIA's revenue for fiscal year 2024 was $60.9 billion...
```

## Configuration

The gateway configuration is stored at `.sentinel/gateway.json`. It's auto-created when you run `gateway:login`.

### Example Configurations

**Self-chat configuration** (default after login):

```json
{
  "gateway": {
    "accountId": "default"
  },
  "channels": {
    "whatsapp": {
      "allowFrom": ["+15551234567"],
      "accounts": {}
    }
  }
}
```

**Bot phone configuration** (dedicated Sentinel phone, others message it):

```json
{
  "gateway": {
    "accountId": "default"
  },
  "channels": {
    "whatsapp": {
      "allowFrom": ["+15551234567", "+15559876543"],
      "accounts": {
        "default": {
          "enabled": true,
          "dmPolicy": "allowlist",
          "allowFrom": ["+15551234567", "+15559876543"],
          "groupPolicy": "disabled",
          "groupAllowFrom": [],
          "sendReadReceipts": true
        }
      }
    }
  }
}
```

### Configuration Options

| Field | Description |
|-------|-------------|
| `gateway.accountId` | Which WhatsApp account to use (default: `"default"`) |
| `channels.whatsapp.allowFrom` | Phone numbers allowed to message Sentinel (E.164 format) |
| `channels.whatsapp.accounts.*.dmPolicy` | DM policy: `"allowlist"` or `"open"` |
| `channels.whatsapp.accounts.*.sendReadReceipts` | Whether to send read receipts |

## Group Chat Support

Sentinel can participate in WhatsApp group chats, responding only when @-mentioned.

### Enabling Groups

Add group policy to your account in `.sentinel/gateway.json`:

```json
{
  "channels": {
    "whatsapp": {
      "accounts": {
        "default": {
          "enabled": true,
          "dmPolicy": "allowlist",
          "allowFrom": ["+15551234567"],
          "groupPolicy": "open",
          "groupAllowFrom": ["*"],
          "sendReadReceipts": true
        }
      }
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `groupPolicy` | Group interaction policy: `"disabled"` (default), `"open"` (respond to @-mentions) |
| `groupAllowFrom` | Which groups Sentinel can participate in (`["*"]` for any) |

You don't need to list individual group members — when `groupPolicy` is `"open"`, Sentinel will respond to @-mentions from anyone in any group it's added to.

### How Group Chat Works

1. Add Sentinel's WhatsApp number to a group
2. Send messages normally — Sentinel stays silent
3. @-mention Sentinel (tap `@` and select from the picker) to get a response
4. Sentinel sees recent group messages for context, so it can follow the conversation

## Troubleshooting

### QR Code Not Appearing

- Make sure you have a working internet connection
- Try running `bun run gateway:login` again
- Delete old credentials:
  ```bash
  rm -rf .sentinel/credentials/whatsapp/default
  ```

### Messages Not Being Processed

- Make sure the gateway is running (`bun run gateway`)
- Verify your phone number is in `allowFrom` in `.sentinel/gateway.json`
- Check that the phone format is E.164 (e.g., `+15551234567`)

### Gateway Crashes

- Check `.sentinel/gateway-debug.log` for detailed logs
- Ensure your WhatsApp session is still linked
- Restart the gateway

### Relinking WhatsApp

If you need to relink:

1. On your phone:
   - Open WhatsApp → Settings → Linked Devices
   - Tap on the Sentinel device and select **Log Out**

2. Delete local credentials and relink:
   ```bash
   rm -rf .sentinel/credentials/whatsapp/default
   rm -rf .sentinel/gateway.json
   rm -rf .sentinel/gateway-debug.log
   bun run gateway:login
   ```
