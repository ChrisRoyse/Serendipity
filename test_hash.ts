import { hashPassword } from "./src/auth.ts";

const password = "test123";
const hash = await hashPassword(password);
console.log(`Hash for "${password}": ${hash}`);
