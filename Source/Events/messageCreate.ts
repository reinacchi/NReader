"use strict";

import { Event, Command } from "../Interfaces";
import { ActionRowComponents, EmbedOptions, Message, TextableChannel, TextChannel } from "eris";
import Logger from "../Extensions/logger";

export const event: Event = {
    name: "messageCreate",
    run: async (client, message: Message<TextableChannel>) => {
        let prefix: string = client.database.fetch(`Database.${message.guildID}.Prefix`) || client.config.PREFIX;

        // Ignore bots and incorrect prefix
        if (message.author.bot || !message.member.guild) return;
        if (!message.content.startsWith(prefix)) return;

        // Check if user is using the bot for the first time
        const experience: boolean = client.database.fetch(`Database.${message.author.id}.Experience`);
        const experienceEmbed: EmbedOptions = {
            title: "First Experience",
            description: `Hey there, **${message.author.username}**! It seems that this is your first time using me. \n\n **Warning:** This bot is mostly works in channels that are marked as **NSFW**! \n\n See below for more details.`,
            fields: [
                {
                    name: "Privacy Policy",
                    value: `By using **${client.user.username} Bot**, you understand that we can collect data about you or your servers on Discord: \n **-** User and Server information (name, ID, server members) \n\n And you'll also agreed that you're: \n - Minimum **18+** \n\n Please keep in mind that we only store these data in order for our service to work. \n\n Click **Agree** below to continue! \n\n\n Contact \`reinhardt#8345\` for data removal request.`,
                    inline: false
                }
            ],
            color: client.config.COLOUR,
        };

        const experienceComponent: ActionRowComponents[] = [
            {
                type: 2,
                custom_id: "agree_privacy",
                label: "Agree",
                style: 3
            },
            {
                type: 2,
                custom_id: "disagree_privacy",
                label: "Disagree",
                style: 4
            }
        ];

        if (!experience) {
            message.author.getDMChannel().then((dm) => {
                return dm.createMessage({ content: `${message.author.mention}`, embeds: [experienceEmbed], components: [{ type: 1, components: experienceComponent }] });
            }).catch(() => {
                return message.channel.createMessage({ content: `${message.author.mention}`, embeds: [experienceEmbed], components: [{ type: 1, components: experienceComponent }] });
            });
        } else if (experience === true) {
            const messageArray: string[] = message.content.split(" ");
            const args: string[] = messageArray.slice(1);
            const commandName: string = messageArray[0].slice(prefix.length);
            const command: Command = client.commands.get(commandName) || client.aliases.get(commandName);

            if (!command) return;

            // Checking Circumstances
            if (command.nsfwOnly && !(message.channel as TextChannel).nsfw) {
                return message.channel.createMessage({ embeds: [{ description: "This command is only executable in **NSFW Channels**!", color: client.config.COLOUR }], messageReference: { messageID: message.id } });
            }
            if (command.adminOnly && !client.config.ADMIN_ID.includes(message.author.id)) return;

            if (command) {
                command.run(client, message, args);
                Logger.command("COMMAND", `${message.author.username}#${message.author.discriminator} (${message.author.id}) Runs "${command.name}" At Guild: ${message.member.guild.name} (${message.guildID})`);
            }
        }
    }
}