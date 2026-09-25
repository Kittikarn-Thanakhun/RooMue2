import { googleEnabled } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return <RegisterForm googleEnabled={googleEnabled} />;
}
