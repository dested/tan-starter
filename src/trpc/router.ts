import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'
import { router, publicProcedure, protectedProcedure } from './init'
import { db } from '~/db'
import { post, user } from '~/db/schema'

export const appRouter = router({
  me: protectedProcedure.query(({ ctx }) => ctx.session.user),
  posts: router({
    list: publicProcedure.query(async () => {
      return db
        .select({
          id: post.id,
          title: post.title,
          content: post.content,
          createdAt: post.createdAt,
          authorName: user.name,
        })
        .from(post)
        .leftJoin(user, eq(post.authorId, user.id))
        .orderBy(desc(post.createdAt))
        .limit(50)
    }),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1).max(200),
          content: z.string().min(1).max(2000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const [created] = await db
          .insert(post)
          .values({ ...input, authorId: ctx.session.user.id })
          .returning()
        return created
      }),
  }),
})

export type AppRouter = typeof appRouter
