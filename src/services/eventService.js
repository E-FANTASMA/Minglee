import { supabase } from "../supabase.js";
import { ApiError } from "../utils/apiError.js";

function mapEvent(event) {
  return {
    id: event.id,
    event_name: event.event_name,
    event_picture: event.event_picture,
    event_day: event.event_day,
    created_at: event.created_at ?? null,
    attendee_count: Number(event.attendee_count ?? 0),
  };
}

export async function createEvent(input) {
  const { data, error } = await supabase
    .from("events")
    .insert(input)
    .select("id,event_name,event_picture,event_day,created_at")
    .single();

  if (error) {
    throw new ApiError(400, "Unable to create event", {
      message: error.message,
      details: error.details,
    });
  }

  return mapEvent({ ...data, attendee_count: 0 });
}

export async function listEvents() {
  const { data: events, error } = await supabase
    .from("events")
    .select("id,event_name,event_picture,event_day,created_at")
    .order("event_day", { ascending: true });

  if (error) {
    throw new ApiError(400, "Unable to fetch events", {
      message: error.message,
      details: error.details,
    });
  }

  const safeEvents = events ?? [];

  const { data: attendees, error: attendeeError } = await supabase
    .from("event_attendees")
    .select("event_id");

  if (attendeeError) {
    throw new ApiError(400, "Unable to fetch event attendees", {
      message: attendeeError.message,
      details: attendeeError.details,
    });
  }

  const attendeeCounts = new Map();
  for (const attendee of attendees ?? []) {
    const currentCount = attendeeCounts.get(attendee.event_id) ?? 0;
    attendeeCounts.set(attendee.event_id, currentCount + 1);
  }

  return safeEvents.map((event) =>
    mapEvent({
      ...event,
      attendee_count: attendeeCounts.get(event.id) ?? 0,
    }),
  );
}

export async function registerForEvent({ eventId, userId }) {
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,event_name,event_picture,event_day,created_at")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    throw new ApiError(400, "Unable to check event", {
      message: eventError.message,
      details: eventError.details,
    });
  }

  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  const { data: existing, error: existingError } = await supabase
    .from("event_attendees")
    .select("event_id,user_id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    throw new ApiError(400, "Unable to check registration", {
      message: existingError.message,
      details: existingError.details,
    });
  }

  if (existing) {
    throw new ApiError(409, "User already registered for this event");
  }

  const { error: insertError } = await supabase
    .from("event_attendees")
    .insert({ event_id: eventId, user_id: userId });

  if (insertError) {
    throw new ApiError(400, "Unable to register for event", {
      message: insertError.message,
      details: insertError.details,
    });
  }

  const { count, error: countError } = await supabase
    .from("event_attendees")
    .select("user_id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (countError) {
    throw new ApiError(400, "Unable to count event attendees", {
      message: countError.message,
      details: countError.details,
    });
  }

  return {
    event: mapEvent({ ...event, attendee_count: count ?? 0 }),
    registration: {
      event_id: eventId,
      user_id: userId,
    },
  };
}
