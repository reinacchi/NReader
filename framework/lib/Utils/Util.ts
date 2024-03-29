import { TLocale } from "../Types";
import {
    CommandInteraction,
    Constants,
    ModalSubmitInteraction,
    PublicThreadChannel,
    TextChannel,
} from "oceanic.js";
import { NReaderClient } from "../Client";
import { EmbedBuilder } from "@oceanicjs/builders";
import { ICommandRunPayload } from "../Interfaces";
import byteSize from "byte-size";

interface IByteSize {
    value: number;
    unit: string;
}

export class Util {
    /**
     * Split array into chunks
     * @param array The array to be split into chunks
     * @param chunkSize Elements per chunk
     * @returns {T[]}
     */
    public static arrayToChunks<T>(array: T[], chunkSize: number): T[][] {
        const result = array.reduce((resultArray, item, index) => {
            const chunkIndex = Math.floor(index / chunkSize);

            if (!resultArray[chunkIndex]) {
                resultArray[chunkIndex] = [];
            }

            resultArray[chunkIndex].push(item);

            return resultArray;
        }, []);

        return result;
    }

    /**
     * Convert a number to a readable size
     * @param bytes The bytes to convert
     * @returns {IByteSize}
     */
    public static bytesToSize(bytes: number): IByteSize {
        return byteSize(bytes) as any;
    }

    /**
     * Check for slash commands member permission
     * @param client NReader client
     * @param interaction Oceanic command interaction
     * @returns {Promise<void>}
     */
    public static checkCommandPerms(
        client: NReaderClient,
        interaction: CommandInteraction<TextChannel>
    ): Promise<void> {
        const command = client.commands.get(interaction.data.name);
        const payload: ICommandRunPayload = { client, interaction };
        const embed = new EmbedBuilder().setColor(client.config.BOT.COLOUR);

        // Check if an owner-marked slash commands is run by random users
        // By default, there's no command with `adminOnly` set to true. However, this is for
        // security safety
        if (
            command.adminOnly &&
            !client.config.BOT.ADMIN.includes(interaction.member.id)
        ) {
            return interaction.createMessage({
                embeds: [
                    embed
                        .setDescription(client.translate("mod.noperms"))
                        .toJSON(),
                ],
                flags: Constants.MessageFlags.EPHEMERAL,
            });
        }

        // Check if user with no `manageGuild` perms runs the slash commands for guild mods
        if (
            command.guildModOnly &&
            !interaction.member.permissions.has("MANAGE_GUILD")
        ) {
            return interaction.createMessage({
                embeds: [
                    embed
                        .setDescription(client.translate("mod.noperms"))
                        .toJSON(),
                ],
                flags: Constants.MessageFlags.EPHEMERAL,
            });
        }

        // Bypass NSFW restrictions
        if (
            command.nsfwOnly &&
            !interaction.channel.nsfw &&
            client.config.BOT.ADMIN.includes(interaction.member.id)
        ) {
            return command.run(payload);
        }

        // Check if an NSFW command is run in an NSFW thread channel
        if (interaction.channel instanceof PublicThreadChannel) {
            if (
                command.nsfwOnly &&
                (
                    interaction.guild.channels.get(
                        (interaction.channel as PublicThreadChannel).parentID
                    ) as TextChannel
                ).nsfw
            ) {
                return command.run(payload);
            }

            if (
                command.nsfwOnly &&
                !(
                    interaction.guild.channels.get(
                        (interaction.channel as PublicThreadChannel).parentID
                    ) as TextChannel
                ).nsfw
            ) {
                return interaction.createMessage({
                    embeds: [
                        embed
                            .setDescription(client.translate("mod.noperms"))
                            .toJSON(),
                    ],
                    flags: Constants.MessageFlags.EPHEMERAL,
                });
            }
        }

        // Check if an NSFW command is run outside channels marked as NSFW
        if (command.nsfwOnly && !interaction.channel.nsfw) {
            return interaction.createMessage({
                embeds: [
                    embed
                        .setDescription(client.translate("main.noperms"))
                        .toJSON(),
                ],
                flags: Constants.MessageFlags.EPHEMERAL,
            });
        }

        return command.run(payload);
    }

    /**
     * Copies an object
     * @param obj The object to clone
     * @returns {Object}
     */
    public static cloneObject(obj): object {
        return Object.assign(Object.create(obj), obj);
    }

    /**
     * Convert boolean type to "True" or "False" string
     * @param value The boolean value
     * @returns {string}
     */
    public static convertBoolean(value: boolean): string {
        return value ? "True" : "False";
    }

    /**
     * Convert 2 code country to full text
     * @param locale The locale
     * @returns {string}
     */
    public static convertLocale(locale: TLocale): string {
        let output: string;

        switch (locale) {
            case "en":
                output = "English";
                break;
            case "eo":
                output = "Esperanto";
                break;
            case "id":
                output = "Bahasa Indonesia";
                break;
            case "ja":
                output = "日本語";
                break;
            case "zh":
                output = "中文";
                break;
            default:
                output = "Unknown";
                break;
        }

        return output;
    }

    /**
     * Finds a common element from arrays.
     * @param firstArray The first array to compare
     * @param secondArray The second array to compare
     * @returns {Boolean}
     */
    public static findCommonElement(
        firstArray: string[],
        secondArray: string[]
    ): boolean {
        for (let i = 0; i < firstArray.length; i++) {
            for (let j = 0; j < secondArray.length; j++) {
                if (firstArray[i] === secondArray[j]) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Get a value of an interaction modal by its ID
     * @param interaction The interaction
     * @param customID The custom ID of the modal
     * @returns {string}
     */
    public static getModalID(
        interaction: ModalSubmitInteraction<TextChannel>,
        customID: string
    ): string {
        return interaction.data.components.find(
            (component) => component.components[0].customID === customID
        ).components[0].value;
    }

    /**
     * Round a number value
     * @param value The value to convert
     * @param decimals The number of decimals to round to
     * @returns {number}
     */
    public static round(value: number, decimals: number): number {
        const multiplier = Math.pow(10, decimals || 0);

        return Math.round(value * multiplier) / multiplier;
    }

    /**
     * Convert seconds to a readable time
     * @param s The seconds
     * @returns {string}
     */
    public static time(s: number): string {
        const pad = (n: number, z = 2) => {
            return ("00" + n).slice(-z);
        };

        const ms = s % 1000;
        s = (s - ms) / 1000;
        const secs = s % 60;
        s = (s - secs) / 60;
        const mins = s % 60;
        let hrs = (s - mins) / 60;

        let days = Math.floor(hrs / 24);
        hrs = hrs % 24;

        let weeks = Math.floor(days / 7);
        days = days % 7;

        const months = Math.floor(weeks / 7);
        weeks = weeks % 7;

        return (
            (months > 0 ? pad(months) + " mo, " : "") +
            (weeks > 0 ? pad(weeks) + " week, " : "") +
            (days > 0 ? pad(days) + " days, " : "") +
            (hrs > 0 ? pad(hrs) + " hrs, " : "") +
            (mins > 0 ? pad(mins) + " mins and " : "") +
            (pad(secs) + " secs")
        );
    }

    /**
     * Verifies the provided data is a string, otherwise throws provided error
     * @param data The string to resolve
     * @param error The error constructor. Default to `Error`
     * @param errorMessage The error message to throw with
     * @param allowEmpty Whether an empty string should be allowed
     * @returns {String}
     */
    public static verifyString(
        data: string,
        error: any,
        errorMessage = `Expected typeof string, received ${data} instead`,
        allowEmpty = true
    ): string {
        if (typeof data !== "string") throw new error(errorMessage);
        if (!allowEmpty && data.length === 0) throw new error(errorMessage);
        return data;
    }
}
