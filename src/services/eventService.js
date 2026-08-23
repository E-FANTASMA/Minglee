import { supabase } from "../supabase.js";
import { ApiError } from "../utils/apiError.js";

/**
 * Record that a user is attending / going to an event
 */
export async function registerAttendance({ userId, eventId, eventName, eventPicture, eventDay, attendeeNotes, source }) {
  if (!userId) {
    throw new ApiError(400, "User ID is required to register for an event");
  }

  // 1. Resolve DB event record (find by ID if valid UUID, or find by event_name, or create if not present)
  let dbEventId = null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
  if (isUuid) {
    const { data: existingEvent } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();
    if (existingEvent) {
      dbEventId = existingEvent.id;
    }
  }

  if (!dbEventId && eventName) {
    const { data: existingByName } = await supabase
      .from("events")
      .select("id")
      .ilike("event_name", eventName.trim())
      .maybeSingle();
    if (existingByName) {
      dbEventId = existingByName.id;
    }
  }

  // If the event is not yet in the DB events table, insert it
  if (!dbEventId) {
    const nameToInsert = eventName || "Mingle Event";
    const pictureToInsert = eventPicture || "/assets/wet-wars.jpeg";
    const dayToInsert = eventDay || "2026-08-28";

    const { data: newEvent, error: createEventErr } = await supabase
      .from("events")
      .insert({
        event_name: nameToInsert,
        event_picture: pictureToInsert,
        event_day: dayToInsert,
      })
      .select("id")
      .single();

    if (createEventErr) {
      throw new ApiError(400, "Unable to register event", {
        message: createEventErr.message,
        details: createEventErr.details,
      });
    }
    dbEventId = newEvent.id;
  }

  // 2. Check if user is already marked as attending
  const { data: existingAttendee } = await supabase
    .from("event_attendees")
    .select("*")
    .eq("event_id", dbEventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingAttendee) {
    return {
      status: "going",
      message: "You're already on the guestlist for this event!",
      attendee: existingAttendee,
    };
  }

  // 3. Insert into event_attendees (recording that user is going to this event)
  const { data: attendeeRecord, error: attendeeErr } = await supabase
    .from("event_attendees")
    .insert({
      event_id: dbEventId,
      user_id: userId,
    })
    .select("*")
    .single();

  if (attendeeErr) {
    throw new ApiError(400, "Unable to record attendance", {
      message: attendeeErr.message,
      details: attendeeErr.details,
    });
  }

  return {
    status: "going",
    message: "Attendance confirmed! You are marked as going to this event.",
    attendee: attendeeRecord,
  };
}

/**
 * Get attendees for an event
 */
export async function getEventAttendees(eventId) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
  let resolvedEventId = isUuid ? eventId : null;

  if (!resolvedEventId) {
    const { data: eventByName } = await supabase
      .from("events")
      .select("id")
      .ilike("event_name", eventId)
      .maybeSingle();
    resolvedEventId = eventByName?.id;
  }

  if (!resolvedEventId) return [];

  const { data, error } = await supabase
    .from("event_attendees")
    .select("created_at, users(id, name, whatsapp_number, onboarding_completed)")
    .eq("event_id", resolvedEventId);

  if (error) {
    throw new ApiError(400, "Unable to fetch attendees", { message: error.message });
  }

  return data ?? [];
}
