"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
   const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
     const [error, setError] = useState("");
      const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
     event.preventDefault();
      setError(""); 
      setLoading(true);
       try {
         const result = await api<{
           token: string;
            user: unknown
           }>
           ("/api/auth/login",
             { method:
               "POST",
                body: JSON.stringify
                ({ email, password })
               });
                localStorage.setItem("restopos_token", result.token); localStorage.setItem("restopos_user", JSON.stringify(result.user));
                 router.push("/");
                 } catch (err) 
                 { setError(
                  err instanceof Error ? err.message : "Unable to sign in."); 
                } finally {
                   setLoading(false); 
                  } }
  return <main className="login-page">
    <div className="login-brand">
      <span className="brand-mark">RP</span>
      <div>
        <span className="eyebrow">Restaurant operations</span>
        <h1>Keep the line moving.</h1>
        </div></div>
        <form className="login-card" onSubmit={submit}>
          <span className="eyebrow">Secure workspace</span>
          <h2>Sign in to the floor.</h2>
          <p className="muted">Use an admin or staff account to open today&apos;s service board.</p>
          <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={6} required />
          </label>
          <p className="muted">Password must be at least 6 characters.</p>
          {error && <div className="alert error">{error}
            </div>}
            <button className="primary-button full" disabled={loading}>{loading ? "Checking credentials…" : "Enter workspace"}</button>
            </form>
            </main>;
}
