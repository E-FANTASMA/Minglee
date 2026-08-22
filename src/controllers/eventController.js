import * as eventService from "../services/eventService.js";
import {
  createEventSchema,
  registerForEventSchema,
} from "../validators/eventSchemas.js";
import { ApiError } from "../utils/apiError.js";

export async function createEvent(req, res) {
  const input = createEventSchema.parse(req.body);
  const event = await eventService.createEvent(input);
  return res.status(201).json({ event });
}

export async function listEvents(_req, res) {
  const events = await eventService.listEvents();
  return res.json({ events });
}

export async function registerForEvent(req, res) {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const input = registerForEventSchema.parse(req.body);
  const result = await eventService.registerForEvent({
    eventId: input.event_id,
    userId,
  });

  return res.status(201).json(result);
}
