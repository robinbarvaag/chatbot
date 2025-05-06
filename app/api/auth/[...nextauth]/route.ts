import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "E-post", type: "text" },
        password: { label: "Passord", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        // Bruk email som unikt brukernavn
        const user = await prisma.user.findUnique({ where: { email: credentials.username } });
        if (!user) return null;
        const valid = await compare(credentials.password, user.password ?? "");
        if (!valid) return null;
        return user;
      }
    })
  ],
  session: { strategy: 'jwt' as const },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
