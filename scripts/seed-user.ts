import { hashPassword } from "../server/auth";
import { connectDatabase } from "../server/config/database";
import { ensureUser } from "../server/store";

const [name, email, password, role = "Admin"] = process.argv.slice(2);

if (!name || !email || !password || !["Admin", "Staff"].includes(role)) {
  console.error("Usage: npm run seed:user -- \"Name\" email@example.com password [Admin|Staff]");
  process.exit(1);
}

await connectDatabase();
await ensureUser({ id: "", name, email: email.toLowerCase(), passwordHash: await hashPassword(password), role: role as "Admin" | "Staff" });
console.log(`Created ${role} user ${email.toLowerCase()} if the account did not already exist.`);
