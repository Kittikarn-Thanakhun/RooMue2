import { listContacts } from "@/app/app/contacts-actions";
import { ContactsList } from "@/components/app/call/contacts-list";

export const dynamic = "force-dynamic";

export default async function CallPage() {
  const contacts = await listContacts();
  return <ContactsList contacts={contacts} />;
}
