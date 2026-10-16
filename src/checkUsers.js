import { supabase } from "./supabase.js";

async function checkUsers() {
  const { data, error } = await supabase.from("users").select("whatsapp_number, name").eq("whatsapp_number", "+23408108996798");
  if (error) {
    console.error("Error fetching users:", error);
  } else {
    console.log("Users in DB:", data);
  }
}

checkUsers();
