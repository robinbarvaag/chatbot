import { prisma } from "@/lib/prisma";

export const createUser = async (email: string, password: string) => {
    const user = await prisma.user.create({
        data: {
            email,
            password,
            name: email,
        },
    });

    if (!user) {
        throw new Error('User not created');
    }

    return user;
};

export const getUser = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        return null;
    }

    return user;
};

export const createGuestUser = async () => {
    const user = await prisma.user.create({
        data: {
            email: 'guest',
            password: 'password',
            name: 'Guest',
        },
    });

    if (!user) {
        throw new Error('Guest user not created');
    }

    return user;
};