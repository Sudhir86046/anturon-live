import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        try {
          const res = await fetch(`${API_URL}/api/trpc/auth.googleLogin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              json: {
                email: profile.email,
                name: (profile as any).name || profile.email,
                googleId: (profile as any).sub || token.sub || '',
              },
            }),
          });
          const data = await res.json();
          const result = data?.result?.data?.json;

          if (result?.isNewUser) {
            // New user — signal frontend to show onboarding
            token.isNewUser = true;
            token.googleEmail = profile.email;
            token.googleName = (profile as any).name || '';
            token.googleId = (profile as any).sub || '';
          } else if (result?.token) {
            // Existing user — store our JWT and org slug
            token.appToken = result.token;
            token.orgSlug = result.organization?.slug;
            token.isNewUser = false;
          }
        } catch (e) {
          console.error('Google login backend error:', e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).appToken = token.appToken;
      (session as any).orgSlug = token.orgSlug;
      (session as any).isNewUser = token.isNewUser;
      (session as any).googleEmail = token.googleEmail;
      (session as any).googleName = token.googleName;
      (session as any).googleId = token.googleId;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});
