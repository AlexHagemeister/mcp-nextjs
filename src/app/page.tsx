import { auth, signIn, signOut } from "./auth";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  return (
    <div className="container">
      {session?.user ? (
        <div className="auth-container">
          <p>Welcome {session.user.name}!</p>
          
          <div style={{ margin: '20px 0' }}>
            <Link href="/ha" className="button" style={{ textDecoration: 'none', display: 'inline-block', padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '5px' }}>
              Configure Home Assistant
            </Link>
          </div>

          <form action={async () => { 'use server'; await signOut(); }}>
            <button className="button button-signout">
              Sign Out
            </button>
          </form>
        </div>
      ) : (
        <form action={async () => { 'use server'; await signIn('google'); }}>
          <button className="button button-signin">
            Sign in with Google
          </button>
        </form>
      )}
    </div>
  );
}
