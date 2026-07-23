# Messaging & Templates

## The 24-hour customer service window

This is the single most important concept to get right:

- Once a user sends your business a message (or clicks certain CTAs like a CTWA ad), a **24-hour window opens**
- Inside that window: send any free-form message type (text, image, video, document, interactive buttons/lists, location, contacts, reactions)
- Outside that window: **only pre-approved template messages** can be sent. A free-form message sent outside the window is rejected by the API.
- Any incoming message from the user resets/reopens the 24h window

Practical implication: if a workflow needs to reach out to a user who hasn't messaged in over 24h (order status update, appointment reminder, re-engagement, marketing), it **must** go through a template — there's no way around this, it's a WhatsApp platform policy, not a Cloud API limitation.

## Template messages

- Created and submitted for approval in Meta Business Manager (WhatsApp Manager > Message Templates)
- Categories: `MARKETING`, `UTILITY`, `AUTHENTICATION` — category affects both approval scrutiny and per-conversation pricing
- Support variables (`{{1}}`, `{{2}}`, etc.) filled in at send-time
- Approval is typically faster than general Meta App Review (often within hours to a day) but budget for possible delays or rejections requiring resubmission
- Once approved, send via the `template` message type referencing the template `name` and `language` code, with `components` supplying the variable values

## Sending messages — basic shape

Using `whatsapp-api-js` message classes (or equivalent raw Graph API payload):

```js
import { WhatsAppAPI } from "whatsapp-api-js";
import { Text, Image, Document } from "whatsapp-api-js/messages";

const Whatsapp = new WhatsAppAPI({ token: TOKEN, appSecret: APP_SECRET });

// Free-form (only valid inside the 24h window)
await Whatsapp.sendMessage(phoneID, to, new Text("Hello!"));

// Reply flow (inside a webhook handler, using the built-in reply helper)
Whatsapp.on.message = async ({ phoneID, from, message, name, reply }) => {
  if (message.type === "text") {
    await reply(new Text(`Hi ${name}, you said: ${message.text.body}`), true);
  }
};
```

## Media handling

- Media (images, documents, audio, video) must first be **uploaded** to Meta's servers to get a `media_id`, or referenced by a public URL
- **Media IDs expire** — don't cache and reuse a `media_id` across sessions or long time gaps; re-upload if the reference is stale
- Downloading inbound media (e.g. a user-sent image) requires a two-step fetch: get the media URL from the media ID first, then fetch the actual bytes from that URL with your access token — the URL itself is short-lived

## Marking messages as read

Call the read-receipt endpoint (`markAsRead` in `whatsapp-api-js`, or the raw `POST /{phone_number_id}/messages` with `status: "read"`) after processing an inbound message — this shows the double-blue-check to the user and is good practice for bot UX, though not strictly required for the API to function.

## Interactive messages

Buttons and list messages are supported for structured replies (e.g. "Choose an option: [Track Order] [Talk to Agent]") — use these over free-text parsing whenever the expected user response is a fixed set of choices; it's more reliable than trying to parse arbitrary text replies.
