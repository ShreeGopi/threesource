"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getLoginErrorMessage,
  getSignupErrorMessage,
} from "@/lib/auth/error-messages";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validations/auth";

const formValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

const redirectWithError = (path: "/login" | "/signup", message: string) => {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
};

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    redirect("/login?error=Enter%20a%20valid%20email%20and%20password.");
  }

  let signInError: unknown = null;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    signInError = error;
  } catch (error) {
    redirectWithError("/login", getLoginErrorMessage(error));
  }

  if (signInError) {
    redirectWithError("/login", getLoginErrorMessage(signInError));
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    redirect(
      "/signup?error=Use%20a%20valid%20email%20and%20a%20password%20with%20at%20least%208%20characters.",
    );
  }

  let signUpError: unknown = null;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp(parsed.data);
    signUpError = error;
  } catch (error) {
    redirectWithError("/signup", getSignupErrorMessage(error));
  }

  if (signUpError) {
    redirectWithError("/signup", getSignupErrorMessage(signUpError));
  }

  redirect(
    "/login?message=Account%20created.%20Log%20in%20to%20continue%20or%20check%20your%20email%20if%20confirmation%20is%20enabled.",
  );
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login?message=You%20have%20been%20signed%20out.");
}
