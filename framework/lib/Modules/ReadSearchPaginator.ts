import { Book } from "nhentai-api";
import {
    CommandInteraction,
    ComponentInteraction,
    ComponentTypes,
    Constants,
    EmbedOptions,
    InteractionContent,
    MessageActionRow,
    Message,
    ModalActionRow,
    ModalSubmitInteraction,
    TextChannel,
} from "oceanic.js";
import { ComponentBuilder, EmbedBuilder } from "@oceanicjs/builders";
import { NReaderClient } from "../Client";
import { UserModel } from "../Models";
import { NReaderConstant } from "../Constant";
import { Util } from "../Utils";
import { SearchPaginator } from "./SearchPaginator";
import { BookmarkPaginator } from "./BookmarkPaginator";

export class ReadSearchPaginator {
    /**
     * NReader client
     */
    client: NReaderClient;

    /**
     * The index of current embed page
     */
    embed: number;

    /**
     * An array of embed pages
     */
    embeds: EmbedOptions[];

    /**
     * Current NHentai gallery
     */
    gallery: Book;

    /**
     * Oceanic command interaction
     */
    interaction: CommandInteraction<TextChannel>;

    /**
     * The main origin paginator class
     */
    mainPaginator: SearchPaginator | BookmarkPaginator;

    /**
     * The message for embed pages
     */
    message: Message<TextChannel>;

    /**
     * Whether the paginator is running or not
     */
    running: boolean;

    /**
     * Creates a read paginator
     * @param client NReader client
     * @param gallery Current NHentai gallery
     * @param interaction Oceanic command interaction
     * @param mainPaginator The main origin paginator class
     */
    constructor(
        client: NReaderClient,
        gallery: Book,
        interaction: CommandInteraction<TextChannel>,
        mainPaginator: SearchPaginator | BookmarkPaginator
    ) {
        this.client = client;
        this.embed = 1;
        this.embeds = gallery.pages.map((page) => {
            return new EmbedBuilder()
                .setAuthor(
                    gallery.id.toString(),
                    undefined,
                    this.client.api.getImageURL(page)
                )
                .setDescription(
                    `> ${client.translate("general.donation", {
                        kofi: "https://ko-fi.com/reinhello",
                    })}`
                )
                .setColor(client.config.BOT.COLOUR)
                .setFooter(`⭐ ${gallery.favorites.toLocaleString()}`)
                .setImage(this.client.api.getImageURL(page))
                .setTitle(gallery.title.pretty)
                .setURL(`https://nhentai.net/g/${gallery.id}`)
                .toJSON();
        });
        this.gallery = gallery;
        this.interaction = interaction;
        this.mainPaginator = mainPaginator;
        this.onRead = this.onRead.bind(this);
        this.running = false;
    }

    /**
     * Initialise the paginator class
     */
    public async initialisePaginator() {
        const components = new ComponentBuilder<MessageActionRow>()
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `first_page_${this.interaction.id}`,
                "<<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `previous_page_${this.interaction.id}`,
                "<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `jumpto_page_${this.interaction.id}`,
                `${this.embed} / ${this.embeds.length}`
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `next_page_${this.interaction.id}`,
                ">"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `last_page_${this.interaction.id}`,
                ">>"
            )
            .addRow()
            .addInteractionButton(
                Constants.ButtonStyles.PRIMARY,
                `home_result_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "🏠",
                }
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `bookmark_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "🔖",
                }
            )
            .addInteractionButton(
                Constants.ButtonStyles.DANGER,
                `stop_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "🗑",
                }
            )
            .toJSON();

        const messageContent: InteractionContent = {
            components,
            embeds: [this.embeds[this.embed - 1]],
        };

        this.client.stats.updateUserHistory(
            this.interaction.user.id,
            "read",
            this.gallery.id.toString()
        );

        this.client.stats.logActivities(
            this.interaction.user.id,
            "read-paginator",
            this.gallery.id.toString(),
            this.embed,
            undefined,
            undefined
        );

        this.message = await this.interaction.editOriginal(messageContent);
    }

    /**
     * Start reading
     * @param interaction Oceanic component interaction
     */
    public async onRead(
        interaction:
            | ComponentInteraction<ComponentTypes.BUTTON>
            | ModalSubmitInteraction<TextChannel>
    ) {
        const userData = await UserModel.findOne({ id: interaction.member.id });

        if (interaction.member.bot) return;

        if (interaction instanceof ComponentInteraction) {
            switch (interaction.data.customID) {
                case `read_${this.interaction.id}`:
                    this.initialisePaginator();
                    interaction.deferUpdate();
                    break;
                case `stop_${this.interaction.id}`:
                    interaction.message.delete();
                    interaction.deferUpdate();
                    this.stopPaginator();
                    this.mainPaginator.stopPaginator();
                    break;
                case `bookmark_${this.interaction.id}`:
                    if (
                        userData.bookmark.includes(this.embeds[0].author.name)
                    ) {
                        interaction.createMessage({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(this.client.config.BOT.COLOUR)
                                    .setDescription(
                                        this.client.translate(
                                            "main.bookmark.removed",
                                            {
                                                id: `[\`${
                                                    this.embeds[0].author.name
                                                }\`](${NReaderConstant.Source.ID(
                                                    this.embeds[0].author.name
                                                )})`,
                                            }
                                        )
                                    )
                                    .toJSON(),
                            ],
                            flags: Constants.MessageFlags.EPHEMERAL,
                        });

                        this.client.stats.logActivities(
                            this.interaction.user.id,
                            "bookmarked",
                            this.embeds[0].author.name,
                            undefined,
                            undefined,
                            undefined,
                            "removed"
                        );

                        UserModel.findOneAndUpdate(
                            { id: interaction.member.id },
                            { $pull: { bookmark: this.embeds[0].author.name } }
                        ).exec();
                    } else {
                        if (
                            !userData.settings.premium &&
                            userData.bookmark.length === 25
                        ) {
                            return interaction.createMessage({
                                embeds: [
                                    new EmbedBuilder()
                                        .setColor(this.client.config.BOT.COLOUR)
                                        .setDescription(
                                            this.client.translate(
                                                "main.bookmark.maxed"
                                            )
                                        )
                                        .toJSON(),
                                ],
                                flags: Constants.MessageFlags.EPHEMERAL,
                            });
                        }

                        interaction.createMessage({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(this.client.config.BOT.COLOUR)
                                    .setDescription(
                                        this.client.translate(
                                            "main.bookmark.saved",
                                            {
                                                id: `[\`${
                                                    this.embeds[0].author.name
                                                }\`](${NReaderConstant.Source.ID(
                                                    this.embeds[0].author.name
                                                )})`,
                                            }
                                        )
                                    )
                                    .toJSON(),
                            ],
                            flags: Constants.MessageFlags.EPHEMERAL,
                        });

                        this.client.stats.logActivities(
                            this.interaction.user.id,
                            "bookmarked",
                            this.embeds[0].author.name,
                            undefined,
                            undefined,
                            undefined,
                            "added"
                        );

                        UserModel.findOneAndUpdate(
                            { id: interaction.member.id },
                            { $push: { bookmark: this.embeds[0].author.name } }
                        ).exec();
                    }

                    break;
                case `next_page_${this.interaction.id}`:
                    interaction.deferUpdate();

                    if (this.embed < this.embeds.length) {
                        this.embed++;
                        this.updatePaginator();
                    }

                    break;
                case `previous_page_${this.interaction.id}`:
                    interaction.deferUpdate();

                    if (this.embed > 1) {
                        this.embed--;
                        this.updatePaginator();
                    }

                    break;
                case `first_page_${this.interaction.id}`:
                    interaction.deferUpdate();

                    this.embed = 1;
                    this.updatePaginator();
                    break;
                case `last_page_${this.interaction.id}`:
                    interaction.deferUpdate();

                    this.embed = this.embeds.length;
                    this.updatePaginator();
                    break;
                case `jumpto_page_${this.interaction.id}`:
                    interaction.createModal({
                        components: new ComponentBuilder<ModalActionRow>()
                            .addTextInput(
                                Constants.TextInputStyles.SHORT,
                                this.client.translate("main.page.enter"),
                                "page_number",
                                this.embed.toLocaleString()
                            )
                            .toJSON(),
                        customID: `jumpto_page_modal_${this.interaction.id}`,
                        title: this.client.translate("main.page.enter"),
                    });

                    break;
            }
        } else {
            switch (interaction.data.customID) {
                case `jumpto_page_modal_${this.interaction.id}`:
                    /* eslint-disable-next-line */
                    const page = parseInt(
                        Util.getModalID(interaction, "page_number")
                    );

                    if (isNaN(page)) {
                        return interaction.createMessage({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(this.client.config.BOT.COLOUR)
                                    .setDescription(
                                        this.client.translate(
                                            "main.page.enter.invalid"
                                        )
                                    )
                                    .toJSON(),
                            ],
                            flags: Constants.MessageFlags.EPHEMERAL,
                        });
                    }

                    if (page > this.embeds.length) {
                        return interaction.createMessage({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(this.client.config.BOT.COLOUR)
                                    .setDescription(
                                        this.client.translate(
                                            "main.page.enter.unknown",
                                            {
                                                index: page.toLocaleString(),
                                            }
                                        )
                                    )
                                    .toJSON(),
                            ],
                            flags: Constants.MessageFlags.EPHEMERAL,
                        });
                    }

                    if (page <= 0) {
                        return interaction.createMessage({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(this.client.config.BOT.COLOUR)
                                    .setDescription(
                                        this.client.translate(
                                            "main.page.enter.unknown",
                                            {
                                                index: page.toLocaleString(),
                                            }
                                        )
                                    )
                                    .toJSON(),
                            ],
                            flags: Constants.MessageFlags.EPHEMERAL,
                        });
                    }

                    this.embed = page;
                    this.updatePaginator();
                    interaction.deferUpdate();
                    break;
            }
        }
    }

    /**
     * Run the paginator class
     */
    public runPaginator() {
        this.client.on("interactionCreate", this.onRead);
        this.running = true;

        setTimeout(() => {
            this.client.off("interactionCreate", this.onRead);
        }, 7200 * 1000);
    }

    /**
     * Stop the paginator class
     */
    public stopPaginator() {
        this.client.off("interactionCreate", this.onRead);
        this.running = false;
    }

    /**
     * Update the paginator class
     */
    public updatePaginator() {
        const components = new ComponentBuilder<MessageActionRow>()
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `first_page_${this.interaction.id}`,
                "<<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `previous_page_${this.interaction.id}`,
                "<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `jumpto_page_${this.interaction.id}`,
                `${this.embed} / ${this.embeds.length}`
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `next_page_${this.interaction.id}`,
                ">"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `last_page_${this.interaction.id}`,
                ">>"
            )
            .addRow()
            .addInteractionButton(
                Constants.ButtonStyles.PRIMARY,
                `home_result_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "🏠",
                }
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `bookmark_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "🔖",
                }
            )
            .addInteractionButton(
                Constants.ButtonStyles.DANGER,
                `stop_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "🗑",
                }
            )
            .toJSON();

        this.client.stats.logActivities(
            this.interaction.user.id,
            "read-paginator",
            this.gallery.id.toString(),
            this.embed,
            undefined,
            undefined
        );

        this.message.edit({
            components,
            embeds: [this.embeds[this.embed - 1]],
        });
    }
}

export async function createReadSearchPaginator(
    client: NReaderClient,
    gallery: Book,
    interaction: CommandInteraction<TextChannel>,
    mainPaginator: SearchPaginator | BookmarkPaginator
) {
    const paginator = new ReadSearchPaginator(
        client,
        gallery,
        interaction,
        mainPaginator
    );

    paginator.runPaginator();

    return Promise.resolve(paginator.message);
}
