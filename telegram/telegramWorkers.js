import { teleBot } from "./bot.js";
import { TELEGRAM_BOT_USERNAME, TELEGRAM_CHANNEL_USERNAME } from "../config.js";
import { generateReferralLink, getChatType } from "./helpers.js";
import { InlineKeyboard } from "grammy";
import { prismaQuery } from "../db/prisma.js";

/**
 *
 * @param {import("fastify").FastifyInstance} app
 * @param {*} _
 * @param {Function} done
 */
export const telegramWorkers = (app, _, done) => {
  console.log("telegramWorkers is running");

  const setupCommands = async () => {
    await teleBot.api.setMyCommands([
      {
        command: "start",
        description: "Start the bot or re-assessments",
      },
      {
        command: "generate",
        description: "Generate referral link for your channel",
      },
      {
        command: "me",
        description: "Get your data",
      },
    ]);
  };

  const setup = async () => {
    await setupCommands();

    teleBot.command(["start", `start${TELEGRAM_BOT_USERNAME}`], async (ctx) => {
      ctx.chatAction = "typing";
      const startPayload = ctx.match;
      const userId = String(ctx.from.id);
      const chatType = getChatType(ctx.chat.type);
      const username = String(ctx.from.username);

      if (chatType !== "private") {
        return await ctx.reply("DM me to start generating referral link");
      }

      if (!username) {
        return await ctx.reply(
          "Please set a username before using a referral link"
        );
      }

      if (startPayload) {
        let userWithPayload;
        try {
          const existingUser = await prismaQuery.user.findFirst({
            where: {
              userId: userId,
            },
          });

          if (existingUser) {
            console.log("User with payload already exist");
            userWithPayload = existingUser;
          } else {
            const savedUser = await prismaQuery.user.create({
              data: {
                userId: userId,
                username: username,
              },
            });
            userWithPayload = savedUser;
            console.log("User with payload saved: ", savedUser);
          }
        } catch (e) {
          console.log("Error while creating user with payload", e);
          return;
        }

        console.log("Processing referral link");
        const parsedReferralUsername = startPayload;

        if (!parsedReferralUsername) {
          return await ctx.reply(
            `Your referral link is invalid please ask for the correct one to your referer`
          );
        }

        if (parsedReferralUsername === username) {
          return await ctx.reply(
            "You can't use your own referral link, that's illegal!"
          );
        }

        try {
          const referral = await prismaQuery.referral.findUnique({
            where: {
              identifier: parsedReferralUsername,
            },
          });

          if (!referral) {
            return await ctx.reply(
              "Referral not found please use a correct link from your referrer"
            );
          }

          const existingReferredUser = await prismaQuery.referralList.findFirst(
            {
              where: {
                userId: userWithPayload.id,
              },
            }
          );

          if (existingReferredUser) {
            console.log("Referred user already exist");
          } else {
            const referredUser = await prismaQuery.referralList.create({
              data: {
                userId: userWithPayload.id,
                referralId: referral.id,
                referralType: "Channel",
              },
            });
            console.log("Referred user created: ", referredUser);
          }
        } catch (e) {
          console.log("There's an error while updating referral list", e);
          return;
        }

        const inlineLinkButton = new InlineKeyboard().url(
          `Join ${TELEGRAM_CHANNEL_USERNAME}`,
          `https://t.me/${TELEGRAM_CHANNEL_USERNAME}`
        );
        return await ctx.reply(
          `Click the link down below to join the channel, you can also make a referral link by using /generate`,
          {
            reply_markup: inlineLinkButton,
          }
        );
      }

      await ctx.reply(
        "Use /generate to generate a referral link for your channel, and don't forget to add me as the member of the channel"
      );

      try {
        const existingUser = await prismaQuery.user.findFirst({
          where: {
            userId: userId,
          },
        });

        if (existingUser) {
          console.log("User already exist");
          return;
        }

        const savedUser = await prismaQuery.user.create({
          data: {
            userId: userId,
            username: username,
          },
        });

        console.log("User saved: ", savedUser);
      } catch (e) {
        console.log("Error while creating user", e);
      }
    });

    teleBot.command(
      ["generate", `generate${TELEGRAM_BOT_USERNAME}`],
      async (ctx) => {
        ctx.chatAction = "typing";
        const userId = String(ctx.from.id);
        const username = String(ctx.from.username);
        const chatType = getChatType(ctx.chat.type);

        if (chatType !== "private") {
          return await ctx.reply("DM me to start generating referral link");
        }

        if (!username) {
          return await ctx.reply(
            "Please set a username before generating a referral"
          );
        }

        const refLink = generateReferralLink(username);

        try {
          const user = await prismaQuery.user.findFirst({
            where: {
              userId: userId,
            },
          });

          if (!user) {
            return await ctx.reply(
              "Please use /start before proceeding any other commands"
            );
          }

          const existingRefLink = await prismaQuery.referral.findUnique({
            where: {
              userId: user.id,
            },
          });

          if (existingRefLink) {
            console.log("Ref link already exist");
            return await ctx.reply(
              `This is the referral link ${existingRefLink.link}, give it to anyone and earn points every time they join ${TELEGRAM_CHANNEL_USERNAME}`
            );
          }

          const createdRef = await prismaQuery.referral.create({
            data: {
              userId: user.id,
              link: refLink.link,
              identifier: username,
            },
          });

          await ctx.reply(
            `This is the referral link ${createdRef.link}, give it to anyone and earn points every time they join ${TELEGRAM_CHANNEL_USERNAME}`
          );
        } catch (e) {
          console.log("Error storing referral", e);
          return await ctx.reply(
            "There's an error while creating the referral link"
          );
        }
      }
    );

    teleBot.command(["me", `me${TELEGRAM_BOT_USERNAME}`], async (ctx) => {
      ctx.chatAction = "typing";
      const userId = String(ctx.from.id);
      const chatType = getChatType(ctx.chat.type);

      if (chatType !== "private") {
        return await ctx.reply("DM me to start generating referral link");
      }

      try {
        const user = await prismaQuery.user.findFirst({
          where: {
            userId: userId,
          },
        });

        if (!user) {
          return await ctx.reply(
            "Please use /start before proceeding any other commands"
          );
        }

        const referredUserTotal = await prismaQuery.referralList.count({
          where: {
            referral: {
              userId: user.id,
            },
          },
        });

        await ctx.reply(
          `
        ======== YOUR STATS ========\n\n🪙 <b>Points:</b> ${user.points}\n\n🔗 <b>Referred User:</b> ${referredUserTotal}
        `,
          {
            parse_mode: "HTML",
          }
        );
      } catch (e) {
        await ctx.reply("There's an error while getting your data");
      }
    });

    teleBot.on("chat_member", async (ctx) => {
      const member = ctx.chatMember.new_chat_member.user;
      const chatType = getChatType(ctx.chat.type);
      const leftMember = ctx.chatMember.old_chat_member.status === "member";

      if (leftMember) {
        console.log("a member left, skipping...");
        return;
      }

      if (chatType !== "channel") {
        console.log("not a channel, skipping...");
        return;
      }

      if (member.is_bot) {
        console.log("New member is bot skipping,,");
        return;
      }

      const userId = String(member.id);

      try {
        const user = await prismaQuery.user.findFirst({
          where: {
            userId: userId,
          },
        });

        if (!user) {
          console.log("User not found, skipping...");
          return;
        }

        const referredUser = await prismaQuery.referralList.findFirst({
          where: {
            userId: user.id,
          },
          include: {
            referral: true,
          },
        });

        if (referredUser) {
          if (referredUser.isSubscribed) {
            console.log(
              "Referred user already joined the channel, skipping adding points"
            );
            return;
          }
          const updatedReferredUser = await prismaQuery.referralList.update({
            where: {
              userId: referredUser.userId,
            },
            data: {
              referralType: "Channel",
              isSubscribed: true,
            },
          });
          const updatedUserPoints = await prismaQuery.user.update({
            where: {
              id: referredUser.referral.userId,
            },
            data: {
              points: {
                increment: 1,
              },
            },
          });

          console.log("Referrer user points updated: ", updatedUserPoints);
          console.log("Referred user updated: ", updatedReferredUser);
          console.log("Referred user found: ", referredUser);
          return;
        }
        console.log("User is not joined via referral link, skipping...");
      } catch (e) {
        console.log("Error while processing new members", e);
      }
    });

    // For group, can be enabled later

    // teleBot.on(":new_chat_members", async (ctx) => {
    //   const chatType = getChatType(ctx.chat.type);

    //   if (chatType === "group") {
    //     const newMembers = ctx.message.new_chat_members;
    //     for (const member of newMembers) {
    //       if (member.is_bot) {
    //         console.log("New member is bot skipping,,");
    //         return;
    //       }
    //       const userId = String(member.id);

    //       try {
    //         const user = await prismaQuery.user.findFirst({
    //           where: {
    //             userId: userId,
    //           },
    //         });

    //         if (!user) {
    //           console.log("User not found, skipping...");
    //           return;
    //         }

    //         const referedUser = await prismaQuery.referalList.findFirst({
    //           where: {
    //             userId: user.id,
    //           },
    //           include: {
    //             referal: true,
    //           },
    //         });

    //         if (referedUser) {
    //           if (referedUser.isJoinedGroup) {
    //             console.log(
    //               "Refered user already joined the group, skipping adding points"
    //             );
    //             return;
    //           }
    //           const updatedReferedUser = await prismaQuery.referalList.update({
    //             where: {
    //               userId: referedUser.userId,
    //             },
    //             data: {
    //               isJoinedGroup: true,
    //             },
    //           });
    //           const updatedUserPoints = await prismaQuery.user.update({
    //             where: {
    //               id: referedUser.referal.userId,
    //             },
    //             data: {
    //               points: {
    //                 increment: 1,
    //               },
    //             },
    //           });

    //           console.log("Referer user points updated: ", updatedUserPoints);
    //           console.log("Refered user updated: ", updatedReferedUser);
    //           console.log("Refered user found: ", referedUser);
    //           return;
    //         }
    //         console.log("User is not joined via referal link, skipping...");
    //       } catch (e) {
    //         console.log("Error while processing new members", e);
    //       }
    //     }
    //   }
    // });

    teleBot.start({
      allowed_updates: [
        "chat_member",
        "message",
        "channel_post",
        "edited_message",
        "callback_query",
        "chat_join_request",
      ],
    });
  };

  setup();

  done();
};
