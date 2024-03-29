import { API, Search } from "nhentai-api";
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
import { ReadSearchPaginator } from "./ReadSearchPaginator";
import { NReaderConstant } from "../Constant";
import { Util } from "../Utils";

export class SearchPaginator {
    /**
     * NHentai API
     */
    api: API;

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
     * Oceanic command interaction
     */
    interaction: CommandInteraction<TextChannel>;

    /**
     * The message for embed pages
     */
    message: Message<TextChannel>;

    /**
     * The read paginator
     */
    paginationEmbed: ReadSearchPaginator;

    /**
     * Whether the paginator is running or not
     */
    running: boolean;

    /**
     * The search result
     */
    search: Search;

    /**
     * Creates a search paginator
     * @param client NReader client
     * @param search The search result
     * @param interaction Oceanic command interaction
     */
    constructor(
        client: NReaderClient,
        search: Search,
        interaction: CommandInteraction<TextChannel>
    ) {
        this.api = client.api;
        this.client = client;
        this.embed = 1;
        this.embeds = [];
        this.interaction = interaction;
        this.onSearch = this.onSearch.bind(this);
        this.running = false;
        this.search = search;
    }

    /**
     * Initialise the paginator class
     */
    public async initialisePaginator() {
        const title = this.search.books.map(
            (gallery, index) =>
                `\`⬛ ${
                    (index + 1).toString().length > 1
                        ? `${index + 1}`
                        : `${index + 1} `
                }\` - [\`${gallery.id}\`](https://nhentai.net/g/${
                    gallery.id
                }) - \`${
                    gallery.title.pretty.length >= 30
                        ? `${gallery.title.pretty.slice(0, 30)}...`
                        : gallery.title.pretty
                }\``
        );
        const embeds = this.search.books.map((gallery, index) => {
            const artistTags: string[] = gallery.artists.map((tag) => tag.name);
            const characterTags: string[] = gallery.characters.map(
                (tag) => tag.name
            );
            const contentTags: string[] = gallery.pureTags.map(
                (tag) => `${tag.name} (${tag.count.toLocaleString()})`
            );
            const languageTags: string[] = gallery.languages.map(
                (tag) => tag.name.charAt(0).toUpperCase() + tag.name.slice(1)
            );
            const parodyTags: string[] = gallery.parodies.map(
                (tag) => tag.name
            );
            const uploadedAt = `<t:${gallery.uploaded.getTime() / 1000}:F>`;
            const stringTag =
                contentTags.join("`, `").length >= 1024
                    ? `${contentTags.join("`, `").slice(0, 1010)}...`
                    : contentTags.join("`, `");

            return new EmbedBuilder()
                .setAuthor(
                    gallery.id.toString(),
                    undefined,
                    `https://nhentai.net/g/${gallery.id}`
                )
                .setColor(this.client.config.BOT.COLOUR)
                .setDescription(
                    title
                        .join("\n")
                        .replace(
                            `\`⬛ ${
                                (index + 1).toString().length > 1
                                    ? `${index + 1}`
                                    : `${index + 1} `
                            }\` - [\`${gallery.id}\`](https://nhentai.net/g/${
                                gallery.id
                            }) - \`${
                                gallery.title.pretty.length >= 30
                                    ? `${gallery.title.pretty.slice(0, 30)}...`
                                    : gallery.title.pretty
                            }\``,
                            `**\`🟥 ${
                                (index + 1).toString().length > 1
                                    ? `${index + 1}`
                                    : `${index + 1} `
                            }\` - [\`${gallery.id}\`](https://nhentai.net/g/${
                                gallery.id
                            }) - \`${
                                gallery.title.pretty.length >= 30
                                    ? `${gallery.title.pretty.slice(0, 30)}...`
                                    : gallery.title.pretty
                            }\`**`
                        )
                )
                .setFooter(`⭐ ${gallery.favorites.toLocaleString()}`)
                .setTitle(
                    this.client.translate("main.page", {
                        firstIndex: this.search.page.toLocaleString(),
                        lastIndex: this.search.pages.toLocaleString(),
                    })
                )
                .setThumbnail(this.client.api.getImageURL(gallery.cover))
                .addField(
                    this.client.translate("main.title"),
                    `\`${gallery.title.pretty}\``
                )
                .addField(
                    this.client.translate("main.pages"),
                    `\`${gallery.pages.length}\``
                )
                .addField(this.client.translate("main.released"), uploadedAt)
                .addField(
                    languageTags.length > 1
                        ? this.client.translate("main.languages")
                        : this.client.translate("main.language"),
                    `\`${
                        languageTags.length !== 0
                            ? languageTags.join("`, `")
                            : this.client.translate("main.none")
                    }\``
                )
                .addField(
                    artistTags.length > 1
                        ? this.client.translate("main.artists")
                        : this.client.translate("main.artist"),
                    `\`${
                        artistTags.length !== 0
                            ? artistTags.join("`, `")
                            : this.client.translate("main.none")
                    }\``
                )
                .addField(
                    characterTags.length > 1
                        ? this.client.translate("main.characters")
                        : this.client.translate("main.character"),
                    `\`${
                        characterTags.length !== 0
                            ? characterTags.join("`, `")
                            : this.client.translate("main.original")
                    }\``
                )
                .addField(
                    parodyTags.length > 1
                        ? this.client.translate("main.parodies")
                        : this.client.translate("main.parody"),
                    `\`${
                        parodyTags.length !== 0
                            ? parodyTags
                                  .join("`, `")
                                  .replace(
                                      "original",
                                      `${this.client.translate(
                                          "main.original"
                                      )}`
                                  )
                            : this.client.translate("main.none")
                    }\``
                )
                .addField(
                    contentTags.length > 1
                        ? this.client.translate("main.tags")
                        : this.client.translate("main.tag"),
                    `\`${
                        contentTags.length !== 0
                            ? stringTag
                            : this.client.translate("main.none")
                    }\``
                );
        });

        this.embeds = embeds.map((embed) => embed.toJSON());

        const components = new ComponentBuilder<MessageActionRow>()
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `first_result_${this.interaction.id}`,
                "<<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `previous_result_${this.interaction.id}`,
                "<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `jumpto_result_${this.interaction.id}`,
                `${this.embed.toLocaleString()} / ${this.embeds.length.toLocaleString()}`
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `next_result_${this.interaction.id}`,
                ">"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `last_result_${this.interaction.id}`,
                ">>"
            )
            .addRow()
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `first_result_page_${this.interaction.id}`,
                "<<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `previous_result_page_${this.interaction.id}`,
                "<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `jumpto_result_page_${this.interaction.id}`,
                `${this.search.page.toLocaleString()} / ${this.search.pages.toLocaleString()}`
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `next_result_page_${this.interaction.id}`,
                ">"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `last_result_page_${this.interaction.id}`,
                ">>"
            )
            .addRow()
            .addInteractionButton(
                Constants.ButtonStyles.PRIMARY,
                `read_result_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "📖",
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
                `stop_result_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "🗑",
                }
            )
            .addInteractionButton(
                Constants.ButtonStyles.PRIMARY,
                `show_cover_${this.interaction.id}`,
                this.client.translate("main.cover.show")
            )
            .toJSON();

        const messageContent: InteractionContent = {
            components,
            embeds: [this.embeds[this.embed - 1]],
        };

        this.message = await this.interaction.editOriginal(messageContent);
        this.updatePaginator();
    }

    /**
     * Start searching
     * @param interaction Oceanic component interaction
     */
    public async onSearch(
        interaction:
            | ComponentInteraction<ComponentTypes.BUTTON>
            | ModalSubmitInteraction<TextChannel>
    ) {
        const userData = await UserModel.findOne({ id: interaction.user.id });

        if (interaction.member.bot) return;

        const embed = EmbedBuilder.loadFromJSON(
            (interaction as ComponentInteraction<ComponentTypes.BUTTON>).message
                ? (interaction as ComponentInteraction<ComponentTypes.BUTTON>)
                      .message.embeds[0]
                : undefined
        );

        const hideComponent = new ComponentBuilder<MessageActionRow>()
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `first_result_${this.interaction.id}`,
                "<<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `previous_result_${this.interaction.id}`,
                "<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `jumpto_result_${this.interaction.id}`,
                `${this.embed.toLocaleString()} / ${this.embeds.length.toLocaleString()}`
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `next_result_${this.interaction.id}`,
                ">"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `last_result_${this.interaction.id}`,
                ">>"
            )
            .addRow()
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `first_result_page_${this.interaction.id}`,
                "<<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `previous_result_page_${this.interaction.id}`,
                "<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `jumpto_result_page_${this.interaction.id}`,
                `${this.search.page.toLocaleString()} / ${this.search.pages.toLocaleString()}`
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `next_result_page_${this.interaction.id}`,
                ">"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `last_result_page_${this.interaction.id}`,
                ">>"
            )
            .addRow()
            .addInteractionButton(
                Constants.ButtonStyles.PRIMARY,
                `read_result_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "📖",
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
                `stop_result_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "🗑",
                }
            )
            .addInteractionButton(
                Constants.ButtonStyles.PRIMARY,
                `hide_cover_${this.interaction.id}`,
                this.client.translate("main.cover.hide")
            )
            .toJSON();

        const showComponent = new ComponentBuilder<MessageActionRow>()
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `first_result_${this.interaction.id}`,
                "<<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `previous_result_${this.interaction.id}`,
                "<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `jumpto_result_${this.interaction.id}`,
                `${this.embed.toLocaleString()} / ${this.embeds.length.toLocaleString()}`
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `next_result_${this.interaction.id}`,
                ">"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `last_result_${this.interaction.id}`,
                ">>"
            )
            .addRow()
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `first_result_page_${this.interaction.id}`,
                "<<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `previous_result_page_${this.interaction.id}`,
                "<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `jumpto_result_page_${this.interaction.id}`,
                `${this.search.page.toLocaleString()} / ${this.search.pages.toLocaleString()}`
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `next_result_page_${this.interaction.id}`,
                ">"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `last_result_page_${this.interaction.id}`,
                ">>"
            )
            .addRow()
            .addInteractionButton(
                Constants.ButtonStyles.PRIMARY,
                `read_result_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "📖",
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
                `stop_result_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "🗑",
                }
            )
            .addInteractionButton(
                Constants.ButtonStyles.PRIMARY,
                `show_cover_${this.interaction.id}`,
                this.client.translate("main.cover.show")
            )
            .toJSON();

        if (interaction instanceof ComponentInteraction) {
            switch (interaction.data.customID) {
                case `read_result_${this.interaction.id}`:
                    interaction.deferUpdate();

                    this.api
                        .getBook(parseInt(embed.toJSON().author.name))
                        .then(async (gallery) => {
                            this.paginationEmbed = new ReadSearchPaginator(
                                this.client,
                                gallery,
                                this.interaction,
                                this
                            );
                            await this.paginationEmbed.initialisePaginator();
                            this.paginationEmbed.runPaginator();
                        });

                    break;
                case `see_more_${this.interaction.id}`:
                    interaction.deferUpdate();
                    this.initialisePaginator();
                    break;
                case `show_cover_${this.interaction.id}`:
                    embed.setImage(
                        this.client.api.getImageURL(
                            (
                                await this.api.getBook(
                                    parseInt(embed.toJSON().author.name)
                                )
                            ).cover
                        )
                    );
                    this.interaction.editOriginal({
                        components: hideComponent,
                        embeds: [embed.toJSON()],
                    });
                    interaction.deferUpdate();
                    break;
                case `hide_cover_${this.interaction.id}`:
                    embed.removeImage();
                    this.interaction.editOriginal({
                        components: showComponent,
                        embeds: [embed.toJSON()],
                    });
                    interaction.deferUpdate();
                    break;
                case `home_result_${this.interaction.id}`:
                    this.interaction.editOriginal({
                        components: showComponent,
                        embeds: [this.embeds[this.embed - 1]],
                    });
                    this.paginationEmbed.stopPaginator();
                    interaction.deferUpdate();
                    break;
                case `stop_result_${this.interaction.id}`:
                    interaction.message.delete();
                    interaction.deferUpdate();
                    this.stopPaginator();

                    try {
                        this.paginationEmbed.stopPaginator();
                    } catch (err) {
                        return;
                    }

                    break;
                case `bookmark_${this.interaction.id}`:
                    if (this.paginationEmbed && this.paginationEmbed.running) {
                        return;
                    }

                    if (
                        userData.bookmark.includes(embed.toJSON().author.name)
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
                                                    embed.toJSON().author.name
                                                }\`](${NReaderConstant.Source.ID(
                                                    embed.toJSON().author.name
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
                            embed.toJSON().author.name,
                            undefined,
                            undefined,
                            undefined,
                            "removed"
                        );

                        UserModel.findOneAndUpdate(
                            { id: interaction.member.id },
                            { $pull: { bookmark: embed.toJSON().author.name } }
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
                                                    embed.toJSON().author.name
                                                }\`](${NReaderConstant.Source.ID(
                                                    embed.toJSON().author.name
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
                            embed.toJSON().author.name,
                            undefined,
                            undefined,
                            undefined,
                            "added"
                        );

                        UserModel.findOneAndUpdate(
                            { id: interaction.member.id },
                            { $push: { bookmark: embed.toJSON().author.name } }
                        ).exec();
                    }

                    break;
                case `next_result_${this.interaction.id}`:
                    interaction.deferUpdate();

                    if (this.embed < this.embeds.length) {
                        this.embed++;
                        this.updatePaginator();
                    }

                    break;
                case `previous_result_${this.interaction.id}`:
                    interaction.deferUpdate();

                    if (this.embed > 1) {
                        this.embed--;
                        this.updatePaginator();
                    }

                    break;
                case `first_result_${this.interaction.id}`:
                    interaction.deferUpdate();

                    this.embed = 1;
                    this.updatePaginator();
                    break;
                case `last_result_${this.interaction.id}`:
                    interaction.deferUpdate();

                    this.embed = this.embeds.length;
                    this.updatePaginator();
                    break;
                case `jumpto_result_${this.interaction.id}`:
                    interaction.createModal({
                        components: new ComponentBuilder<ModalActionRow>()
                            .addTextInput(
                                Constants.TextInputStyles.SHORT,
                                this.client.translate("main.result.enter"),
                                "result_number",
                                this.embed.toLocaleString()
                            )
                            .toJSON(),
                        customID: `jumpto_result_modal_${this.interaction.id}`,
                        title: this.client.translate("main.result.enter"),
                    });

                    break;
                case `jumpto_result_page_${this.interaction.id}`:
                    interaction.createModal({
                        components: new ComponentBuilder<ModalActionRow>()
                            .addTextInput(
                                Constants.TextInputStyles.SHORT,
                                this.client.translate("main.page.enter"),
                                "result_page_number",
                                this.search.page.toLocaleString()
                            )
                            .toJSON(),
                        customID: `jumpto_result_page_modal_${this.interaction.id}`,
                        title: this.client.translate("main.page.enter"),
                    });

                    break;
                case `next_result_page_${this.interaction.id}`:
                    interaction.deferUpdate();

                    if (
                        parseInt(
                            embed
                                .toJSON()
                                .title.split(
                                    this.client
                                        .translate("main.page")
                                        .split(" ")[0]
                                )[1]
                                .split("/")[0]
                        ) < this.search.pages
                    ) {
                        this.api
                            .search(
                                this.search.query,
                                parseInt(
                                    embed
                                        .toJSON()
                                        .title.split(
                                            this.client
                                                .translate("main.page")
                                                .split(" ")[0]
                                        )[1]
                                        .split("/")[0]
                                ) + 1
                            )
                            .then((search) => {
                                const title = search.books.map(
                                    (gallery, index) =>
                                        `\`⬛ ${
                                            (index + 1).toString().length > 1
                                                ? `${index + 1}`
                                                : `${index + 1} `
                                        }\` - [\`${
                                            gallery.id
                                        }\`](https://nhentai.net/g/${
                                            gallery.id
                                        }) - \`${
                                            gallery.title.pretty.length >= 30
                                                ? `${gallery.title.pretty.slice(
                                                      0,
                                                      30
                                                  )}...`
                                                : gallery.title.pretty
                                        }\``
                                );
                                const embeds = search.books.map(
                                    (gallery, index) => {
                                        const artistTags: string[] =
                                            gallery.artists.map(
                                                (tag) => tag.name
                                            );
                                        const characterTags: string[] =
                                            gallery.characters.map(
                                                (tag) => tag.name
                                            );
                                        const contentTags: string[] =
                                            gallery.pureTags.map(
                                                (tag) =>
                                                    `${
                                                        tag.name
                                                    } (${tag.count.toLocaleString()})`
                                            );
                                        const languageTags: string[] =
                                            gallery.languages.map(
                                                (tag) =>
                                                    tag.name
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                    tag.name.slice(1)
                                            );
                                        const parodyTags: string[] =
                                            gallery.parodies.map(
                                                (tag) => tag.name
                                            );
                                        const uploadedAt = `<t:${
                                            gallery.uploaded.getTime() / 1000
                                        }:F>`;
                                        const stringTag =
                                            contentTags.join("`, `").length >=
                                            1024
                                                ? `${contentTags
                                                      .join("`, `")
                                                      .slice(0, 1010)}...`
                                                : contentTags.join("`, `");

                                        return new EmbedBuilder()
                                            .setAuthor(
                                                gallery.id.toString(),
                                                undefined,
                                                `https://nhentai.net/g/${gallery.id}`
                                            )
                                            .setColor(
                                                this.client.config.BOT.COLOUR
                                            )
                                            .setDescription(
                                                title
                                                    .join("\n")
                                                    .replace(
                                                        `\`⬛ ${
                                                            (
                                                                index + 1
                                                            ).toString()
                                                                .length > 1
                                                                ? `${index + 1}`
                                                                : `${
                                                                      index + 1
                                                                  } `
                                                        }\` - [\`${
                                                            gallery.id
                                                        }\`](https://nhentai.net/g/${
                                                            gallery.id
                                                        }) - \`${
                                                            gallery.title.pretty
                                                                .length >= 30
                                                                ? `${gallery.title.pretty.slice(
                                                                      0,
                                                                      30
                                                                  )}...`
                                                                : gallery.title
                                                                      .pretty
                                                        }\``,
                                                        `**\`🟥 ${
                                                            (
                                                                index + 1
                                                            ).toString()
                                                                .length > 1
                                                                ? `${index + 1}`
                                                                : `${
                                                                      index + 1
                                                                  } `
                                                        }\` - [\`${
                                                            gallery.id
                                                        }\`](https://nhentai.net/g/${
                                                            gallery.id
                                                        }) - \`${
                                                            gallery.title.pretty
                                                                .length >= 30
                                                                ? `${gallery.title.pretty.slice(
                                                                      0,
                                                                      30
                                                                  )}...`
                                                                : gallery.title
                                                                      .pretty
                                                        }\`**`
                                                    )
                                            )
                                            .setFooter(
                                                `⭐ ${gallery.favorites.toLocaleString()}`
                                            )
                                            .setTitle(
                                                this.client.translate(
                                                    "main.page",
                                                    {
                                                        firstIndex:
                                                            search.page.toLocaleString(),
                                                        lastIndex:
                                                            search.pages.toLocaleString(),
                                                    }
                                                )
                                            )
                                            .setThumbnail(
                                                this.client.api.getImageURL(
                                                    gallery.cover
                                                )
                                            )
                                            .addField(
                                                this.client.translate(
                                                    "main.title"
                                                ),
                                                `\`${gallery.title.pretty}\``
                                            )
                                            .addField(
                                                this.client.translate(
                                                    "main.pages"
                                                ),
                                                `\`${gallery.pages.length}\``
                                            )
                                            .addField(
                                                this.client.translate(
                                                    "main.released"
                                                ),
                                                uploadedAt
                                            )
                                            .addField(
                                                languageTags.length > 1
                                                    ? this.client.translate(
                                                          "main.languages"
                                                      )
                                                    : this.client.translate(
                                                          "main.language"
                                                      ),
                                                `\`${
                                                    languageTags.length !== 0
                                                        ? languageTags.join(
                                                              "`, `"
                                                          )
                                                        : this.client.translate(
                                                              "main.none"
                                                          )
                                                }\``
                                            )
                                            .addField(
                                                artistTags.length > 1
                                                    ? this.client.translate(
                                                          "main.artists"
                                                      )
                                                    : this.client.translate(
                                                          "main.artist"
                                                      ),
                                                `\`${
                                                    artistTags.length !== 0
                                                        ? artistTags.join(
                                                              "`, `"
                                                          )
                                                        : this.client.translate(
                                                              "main.none"
                                                          )
                                                }\``
                                            )
                                            .addField(
                                                characterTags.length > 1
                                                    ? this.client.translate(
                                                          "main.characters"
                                                      )
                                                    : this.client.translate(
                                                          "main.character"
                                                      ),
                                                `\`${
                                                    characterTags.length !== 0
                                                        ? characterTags.join(
                                                              "`, `"
                                                          )
                                                        : this.client.translate(
                                                              "main.original"
                                                          )
                                                }\``
                                            )
                                            .addField(
                                                parodyTags.length > 1
                                                    ? this.client.translate(
                                                          "main.parodies"
                                                      )
                                                    : this.client.translate(
                                                          "main.parody"
                                                      ),
                                                `\`${
                                                    parodyTags.length !== 0
                                                        ? parodyTags
                                                              .join("`, `")
                                                              .replace(
                                                                  "original",
                                                                  `${this.client.translate(
                                                                      "main.original"
                                                                  )}`
                                                              )
                                                        : this.client.translate(
                                                              "main.none"
                                                          )
                                                }\``
                                            )
                                            .addField(
                                                contentTags.length > 1
                                                    ? this.client.translate(
                                                          "main.tags"
                                                      )
                                                    : this.client.translate(
                                                          "main.tag"
                                                      ),
                                                `\`${
                                                    contentTags.length !== 0
                                                        ? stringTag
                                                        : this.client.translate(
                                                              "main.none"
                                                          )
                                                }\``
                                            );
                                    }
                                );

                                this.search = search;
                                this.embeds = embeds.map((embed) =>
                                    embed.toJSON()
                                );
                                this.embed = 1;
                                this.updatePaginator();
                            });
                    }

                    break;
                case `previous_result_page_${this.interaction.id}`:
                    interaction.deferUpdate();

                    if (
                        parseInt(
                            embed
                                .toJSON()
                                .title.split(
                                    this.client
                                        .translate("main.page")
                                        .split(" ")[0]
                                )[1]
                                .split("/")[0]
                        ) > 1
                    ) {
                        this.api
                            .search(
                                this.search.query,
                                parseInt(
                                    embed
                                        .toJSON()
                                        .title.split(
                                            this.client
                                                .translate("main.page")
                                                .split(" ")[0]
                                        )[1]
                                        .split("/")[0]
                                ) - 1
                            )
                            .then((search) => {
                                const title = search.books.map(
                                    (gallery, index) =>
                                        `\`⬛ ${
                                            (index + 1).toString().length > 1
                                                ? `${index + 1}`
                                                : `${index + 1} `
                                        }\` - [\`${
                                            gallery.id
                                        }\`](https://nhentai.net/g/${
                                            gallery.id
                                        }) - \`${
                                            gallery.title.pretty.length >= 30
                                                ? `${gallery.title.pretty.slice(
                                                      0,
                                                      30
                                                  )}...`
                                                : gallery.title.pretty
                                        }\``
                                );
                                const embeds = search.books.map(
                                    (gallery, index) => {
                                        const artistTags: string[] =
                                            gallery.artists.map(
                                                (tag) => tag.name
                                            );
                                        const characterTags: string[] =
                                            gallery.characters.map(
                                                (tag) => tag.name
                                            );
                                        const contentTags: string[] =
                                            gallery.pureTags.map(
                                                (tag) =>
                                                    `${
                                                        tag.name
                                                    } (${tag.count.toLocaleString()})`
                                            );
                                        const languageTags: string[] =
                                            gallery.languages.map(
                                                (tag) =>
                                                    tag.name
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                    tag.name.slice(1)
                                            );
                                        const parodyTags: string[] =
                                            gallery.parodies.map(
                                                (tag) => tag.name
                                            );
                                        const uploadedAt = `<t:${
                                            gallery.uploaded.getTime() / 1000
                                        }:F>`;
                                        const stringTag =
                                            contentTags.join("`, `").length >=
                                            1024
                                                ? `${contentTags
                                                      .join("`, `")
                                                      .slice(0, 1010)}...`
                                                : contentTags.join("`, `");

                                        return new EmbedBuilder()
                                            .setAuthor(
                                                gallery.id.toString(),
                                                undefined,
                                                `https://nhentai.net/g/${gallery.id}`
                                            )
                                            .setColor(
                                                this.client.config.BOT.COLOUR
                                            )
                                            .setDescription(
                                                title
                                                    .join("\n")
                                                    .replace(
                                                        `\`⬛ ${
                                                            (
                                                                index + 1
                                                            ).toString()
                                                                .length > 1
                                                                ? `${index + 1}`
                                                                : `${
                                                                      index + 1
                                                                  } `
                                                        }\` - [\`${
                                                            gallery.id
                                                        }\`](https://nhentai.net/g/${
                                                            gallery.id
                                                        }) - \`${
                                                            gallery.title.pretty
                                                                .length >= 30
                                                                ? `${gallery.title.pretty.slice(
                                                                      0,
                                                                      30
                                                                  )}...`
                                                                : gallery.title
                                                                      .pretty
                                                        }\``,
                                                        `**\`🟥 ${
                                                            (
                                                                index + 1
                                                            ).toString()
                                                                .length > 1
                                                                ? `${index + 1}`
                                                                : `${
                                                                      index + 1
                                                                  } `
                                                        }\` - [\`${
                                                            gallery.id
                                                        }\`](https://nhentai.net/g/${
                                                            gallery.id
                                                        }) - \`${
                                                            gallery.title.pretty
                                                                .length >= 30
                                                                ? `${gallery.title.pretty.slice(
                                                                      0,
                                                                      30
                                                                  )}...`
                                                                : gallery.title
                                                                      .pretty
                                                        }\`**`
                                                    )
                                            )
                                            .setFooter(
                                                `⭐ ${gallery.favorites.toLocaleString()}`
                                            )
                                            .setTitle(
                                                this.client.translate(
                                                    "main.page",
                                                    {
                                                        firstIndex:
                                                            search.page.toLocaleString(),
                                                        lastIndex:
                                                            search.pages.toLocaleString(),
                                                    }
                                                )
                                            )
                                            .setThumbnail(
                                                this.client.api.getImageURL(
                                                    gallery.cover
                                                )
                                            )
                                            .addField(
                                                this.client.translate(
                                                    "main.title"
                                                ),
                                                `\`${gallery.title.pretty}\``
                                            )
                                            .addField(
                                                this.client.translate(
                                                    "main.pages"
                                                ),
                                                `\`${gallery.pages.length}\``
                                            )
                                            .addField(
                                                this.client.translate(
                                                    "main.released"
                                                ),
                                                uploadedAt
                                            )
                                            .addField(
                                                languageTags.length > 1
                                                    ? this.client.translate(
                                                          "main.languages"
                                                      )
                                                    : this.client.translate(
                                                          "main.language"
                                                      ),
                                                `\`${
                                                    languageTags.length !== 0
                                                        ? languageTags.join(
                                                              "`, `"
                                                          )
                                                        : this.client.translate(
                                                              "main.none"
                                                          )
                                                }\``
                                            )
                                            .addField(
                                                artistTags.length > 1
                                                    ? this.client.translate(
                                                          "main.artists"
                                                      )
                                                    : this.client.translate(
                                                          "main.artist"
                                                      ),
                                                `\`${
                                                    artistTags.length !== 0
                                                        ? artistTags.join(
                                                              "`, `"
                                                          )
                                                        : this.client.translate(
                                                              "main.none"
                                                          )
                                                }\``
                                            )
                                            .addField(
                                                characterTags.length > 1
                                                    ? this.client.translate(
                                                          "main.characters"
                                                      )
                                                    : this.client.translate(
                                                          "main.character"
                                                      ),
                                                `\`${
                                                    characterTags.length !== 0
                                                        ? characterTags.join(
                                                              "`, `"
                                                          )
                                                        : this.client.translate(
                                                              "main.original"
                                                          )
                                                }\``
                                            )
                                            .addField(
                                                parodyTags.length > 1
                                                    ? this.client.translate(
                                                          "main.parodies"
                                                      )
                                                    : this.client.translate(
                                                          "main.parody"
                                                      ),
                                                `\`${
                                                    parodyTags.length !== 0
                                                        ? parodyTags
                                                              .join("`, `")
                                                              .replace(
                                                                  "original",
                                                                  `${this.client.translate(
                                                                      "main.original"
                                                                  )}`
                                                              )
                                                        : this.client.translate(
                                                              "main.none"
                                                          )
                                                }\``
                                            )
                                            .addField(
                                                contentTags.length > 1
                                                    ? this.client.translate(
                                                          "main.tags"
                                                      )
                                                    : this.client.translate(
                                                          "main.tag"
                                                      ),
                                                `\`${
                                                    contentTags.length !== 0
                                                        ? stringTag
                                                        : this.client.translate(
                                                              "main.none"
                                                          )
                                                }\``
                                            );
                                    }
                                );

                                this.search = search;
                                this.embeds = embeds.map((embed) =>
                                    embed.toJSON()
                                );
                                this.embed = 1;
                                this.updatePaginator();
                            });
                    }

                    break;
                case `first_result_page_${this.interaction.id}`:
                    interaction.deferUpdate();

                    this.api.search(this.search.query, 1).then((search) => {
                        const title = search.books.map(
                            (gallery, index) =>
                                `\`⬛ ${
                                    (index + 1).toString().length > 1
                                        ? `${index + 1}`
                                        : `${index + 1} `
                                }\` - [\`${
                                    gallery.id
                                }\`](https://nhentai.net/g/${gallery.id}) - \`${
                                    gallery.title.pretty.length >= 30
                                        ? `${gallery.title.pretty.slice(
                                              0,
                                              30
                                          )}...`
                                        : gallery.title.pretty
                                }\``
                        );
                        const embeds = search.books.map((gallery, index) => {
                            const artistTags: string[] = gallery.artists.map(
                                (tag) => tag.name
                            );
                            const characterTags: string[] =
                                gallery.characters.map((tag) => tag.name);
                            const contentTags: string[] = gallery.pureTags.map(
                                (tag) =>
                                    `${
                                        tag.name
                                    } (${tag.count.toLocaleString()})`
                            );
                            const languageTags: string[] =
                                gallery.languages.map(
                                    (tag) =>
                                        tag.name.charAt(0).toUpperCase() +
                                        tag.name.slice(1)
                                );
                            const parodyTags: string[] = gallery.parodies.map(
                                (tag) => tag.name
                            );
                            const uploadedAt = `<t:${
                                gallery.uploaded.getTime() / 1000
                            }:F>`;
                            const stringTag =
                                contentTags.join("`, `").length >= 1024
                                    ? `${contentTags
                                          .join("`, `")
                                          .slice(0, 1010)}...`
                                    : contentTags.join("`, `");

                            return new EmbedBuilder()
                                .setAuthor(
                                    gallery.id.toString(),
                                    undefined,
                                    `https://nhentai.net/g/${gallery.id}`
                                )
                                .setColor(this.client.config.BOT.COLOUR)
                                .setDescription(
                                    title
                                        .join("\n")
                                        .replace(
                                            `\`⬛ ${
                                                (index + 1).toString().length >
                                                1
                                                    ? `${index + 1}`
                                                    : `${index + 1} `
                                            }\` - [\`${
                                                gallery.id
                                            }\`](https://nhentai.net/g/${
                                                gallery.id
                                            }) - \`${
                                                gallery.title.pretty.length >=
                                                30
                                                    ? `${gallery.title.pretty.slice(
                                                          0,
                                                          30
                                                      )}...`
                                                    : gallery.title.pretty
                                            }\``,
                                            `**\`🟥 ${
                                                (index + 1).toString().length >
                                                1
                                                    ? `${index + 1}`
                                                    : `${index + 1} `
                                            }\` - [\`${
                                                gallery.id
                                            }\`](https://nhentai.net/g/${
                                                gallery.id
                                            }) - \`${
                                                gallery.title.pretty.length >=
                                                30
                                                    ? `${gallery.title.pretty.slice(
                                                          0,
                                                          30
                                                      )}...`
                                                    : gallery.title.pretty
                                            }\`**`
                                        )
                                )
                                .setFooter(
                                    `⭐ ${gallery.favorites.toLocaleString()}`
                                )
                                .setTitle(
                                    this.client.translate("main.page", {
                                        firstIndex:
                                            search.page.toLocaleString(),
                                        lastIndex:
                                            search.pages.toLocaleString(),
                                    })
                                )
                                .setThumbnail(
                                    this.client.api.getImageURL(gallery.cover)
                                )
                                .addField(
                                    this.client.translate("main.title"),
                                    `\`${gallery.title.pretty}\``
                                )
                                .addField(
                                    this.client.translate("main.pages"),
                                    `\`${gallery.pages.length}\``
                                )
                                .addField(
                                    this.client.translate("main.released"),
                                    uploadedAt
                                )
                                .addField(
                                    languageTags.length > 1
                                        ? this.client.translate(
                                              "main.languages"
                                          )
                                        : this.client.translate(
                                              "main.language"
                                          ),
                                    `\`${
                                        languageTags.length !== 0
                                            ? languageTags.join("`, `")
                                            : this.client.translate("main.none")
                                    }\``
                                )
                                .addField(
                                    artistTags.length > 1
                                        ? this.client.translate("main.artists")
                                        : this.client.translate("main.artist"),
                                    `\`${
                                        artistTags.length !== 0
                                            ? artistTags.join("`, `")
                                            : this.client.translate("main.none")
                                    }\``
                                )
                                .addField(
                                    characterTags.length > 1
                                        ? this.client.translate(
                                              "main.characters"
                                          )
                                        : this.client.translate(
                                              "main.character"
                                          ),
                                    `\`${
                                        characterTags.length !== 0
                                            ? characterTags.join("`, `")
                                            : this.client.translate(
                                                  "main.original"
                                              )
                                    }\``
                                )
                                .addField(
                                    parodyTags.length > 1
                                        ? this.client.translate("main.parodies")
                                        : this.client.translate("main.parody"),
                                    `\`${
                                        parodyTags.length !== 0
                                            ? parodyTags
                                                  .join("`, `")
                                                  .replace(
                                                      "original",
                                                      `${this.client.translate(
                                                          "main.original"
                                                      )}`
                                                  )
                                            : this.client.translate("main.none")
                                    }\``
                                )
                                .addField(
                                    contentTags.length > 1
                                        ? this.client.translate("main.tags")
                                        : this.client.translate("main.tag"),
                                    `\`${
                                        contentTags.length !== 0
                                            ? stringTag
                                            : this.client.translate("main.none")
                                    }\``
                                );
                        });

                        this.search = search;
                        this.embeds = embeds.map((embed) => embed.toJSON());
                        this.embed = 1;
                        this.updatePaginator();
                    });

                    break;
                case `last_result_page_${this.interaction.id}`:
                    interaction.deferUpdate();

                    this.api
                        .search(this.search.query, this.search.pages)
                        .then((search) => {
                            const title = search.books.map(
                                (gallery, index) =>
                                    `\`⬛ ${
                                        (index + 1).toString().length > 1
                                            ? `${index + 1}`
                                            : `${index + 1} `
                                    }\` - [\`${
                                        gallery.id
                                    }\`](https://nhentai.net/g/${
                                        gallery.id
                                    }) - \`${
                                        gallery.title.pretty.length >= 30
                                            ? `${gallery.title.pretty.slice(
                                                  0,
                                                  30
                                              )}...`
                                            : gallery.title.pretty
                                    }\``
                            );
                            const embeds = search.books.map(
                                (gallery, index) => {
                                    const artistTags: string[] =
                                        gallery.artists.map((tag) => tag.name);
                                    const characterTags: string[] =
                                        gallery.characters.map(
                                            (tag) => tag.name
                                        );
                                    const contentTags: string[] =
                                        gallery.pureTags.map(
                                            (tag) =>
                                                `${
                                                    tag.name
                                                } (${tag.count.toLocaleString()})`
                                        );
                                    const languageTags: string[] =
                                        gallery.languages.map(
                                            (tag) =>
                                                tag.name
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                tag.name.slice(1)
                                        );
                                    const parodyTags: string[] =
                                        gallery.parodies.map((tag) => tag.name);
                                    const uploadedAt = `<t:${
                                        gallery.uploaded.getTime() / 1000
                                    }:F>`;
                                    const stringTag =
                                        contentTags.join("`, `").length >= 1024
                                            ? `${contentTags
                                                  .join("`, `")
                                                  .slice(0, 1010)}...`
                                            : contentTags.join("`, `");

                                    return new EmbedBuilder()
                                        .setAuthor(
                                            gallery.id.toString(),
                                            undefined,
                                            `https://nhentai.net/g/${gallery.id}`
                                        )
                                        .setColor(this.client.config.BOT.COLOUR)
                                        .setDescription(
                                            title
                                                .join("\n")
                                                .replace(
                                                    `\`⬛ ${
                                                        (index + 1).toString()
                                                            .length > 1
                                                            ? `${index + 1}`
                                                            : `${index + 1} `
                                                    }\` - [\`${
                                                        gallery.id
                                                    }\`](https://nhentai.net/g/${
                                                        gallery.id
                                                    }) - \`${
                                                        gallery.title.pretty
                                                            .length >= 30
                                                            ? `${gallery.title.pretty.slice(
                                                                  0,
                                                                  30
                                                              )}...`
                                                            : gallery.title
                                                                  .pretty
                                                    }\``,
                                                    `**\`🟥 ${
                                                        (index + 1).toString()
                                                            .length > 1
                                                            ? `${index + 1}`
                                                            : `${index + 1} `
                                                    }\` - [\`${
                                                        gallery.id
                                                    }\`](https://nhentai.net/g/${
                                                        gallery.id
                                                    }) - \`${
                                                        gallery.title.pretty
                                                            .length >= 30
                                                            ? `${gallery.title.pretty.slice(
                                                                  0,
                                                                  30
                                                              )}...`
                                                            : gallery.title
                                                                  .pretty
                                                    }\`**`
                                                )
                                        )
                                        .setFooter(
                                            `⭐ ${gallery.favorites.toLocaleString()}`
                                        )
                                        .setTitle(
                                            this.client.translate("main.page", {
                                                firstIndex:
                                                    search.page.toLocaleString(),
                                                lastIndex:
                                                    search.pages.toLocaleString(),
                                            })
                                        )
                                        .setThumbnail(
                                            this.client.api.getImageURL(
                                                gallery.cover
                                            )
                                        )
                                        .addField(
                                            this.client.translate("main.title"),
                                            `\`${gallery.title.pretty}\``
                                        )
                                        .addField(
                                            this.client.translate("main.pages"),
                                            `\`${gallery.pages.length}\``
                                        )
                                        .addField(
                                            this.client.translate(
                                                "main.released"
                                            ),
                                            uploadedAt
                                        )
                                        .addField(
                                            languageTags.length > 1
                                                ? this.client.translate(
                                                      "main.languages"
                                                  )
                                                : this.client.translate(
                                                      "main.language"
                                                  ),
                                            `\`${
                                                languageTags.length !== 0
                                                    ? languageTags.join("`, `")
                                                    : this.client.translate(
                                                          "main.none"
                                                      )
                                            }\``
                                        )
                                        .addField(
                                            artistTags.length > 1
                                                ? this.client.translate(
                                                      "main.artists"
                                                  )
                                                : this.client.translate(
                                                      "main.artist"
                                                  ),
                                            `\`${
                                                artistTags.length !== 0
                                                    ? artistTags.join("`, `")
                                                    : this.client.translate(
                                                          "main.none"
                                                      )
                                            }\``
                                        )
                                        .addField(
                                            characterTags.length > 1
                                                ? this.client.translate(
                                                      "main.characters"
                                                  )
                                                : this.client.translate(
                                                      "main.character"
                                                  ),
                                            `\`${
                                                characterTags.length !== 0
                                                    ? characterTags.join("`, `")
                                                    : this.client.translate(
                                                          "main.original"
                                                      )
                                            }\``
                                        )
                                        .addField(
                                            parodyTags.length > 1
                                                ? this.client.translate(
                                                      "main.parodies"
                                                  )
                                                : this.client.translate(
                                                      "main.parody"
                                                  ),
                                            `\`${
                                                parodyTags.length !== 0
                                                    ? parodyTags
                                                          .join("`, `")
                                                          .replace(
                                                              "original",
                                                              `${this.client.translate(
                                                                  "main.original"
                                                              )}`
                                                          )
                                                    : this.client.translate(
                                                          "main.none"
                                                      )
                                            }\``
                                        )
                                        .addField(
                                            contentTags.length > 1
                                                ? this.client.translate(
                                                      "main.tags"
                                                  )
                                                : this.client.translate(
                                                      "main.tag"
                                                  ),
                                            `\`${
                                                contentTags.length !== 0
                                                    ? stringTag
                                                    : this.client.translate(
                                                          "main.none"
                                                      )
                                            }\``
                                        );
                                }
                            );

                            this.search = search;
                            this.embeds = embeds.map((embed) => embed.toJSON());
                            this.embed = 1;
                            this.updatePaginator();
                        });

                    break;
            }
        } else {
            switch (interaction.data.customID) {
                case `jumpto_result_modal_${this.interaction.id}`:
                    /* eslint-disable-next-line */
                    const pageResult = parseInt(
                        Util.getModalID(interaction, "result_number")
                    );

                    if (isNaN(pageResult)) {
                        return interaction.createMessage({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(this.client.config.BOT.COLOUR)
                                    .setDescription(
                                        this.client.translate(
                                            "main.result.enter.invalid"
                                        )
                                    )
                                    .toJSON(),
                            ],
                            flags: Constants.MessageFlags.EPHEMERAL,
                        });
                    }

                    if (pageResult > this.embeds.length) {
                        return interaction.createMessage({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(this.client.config.BOT.COLOUR)
                                    .setDescription(
                                        this.client.translate(
                                            "main.result.enter.unknown",
                                            {
                                                index: pageResult.toLocaleString(),
                                            }
                                        )
                                    )
                                    .toJSON(),
                            ],
                            flags: Constants.MessageFlags.EPHEMERAL,
                        });
                    }

                    if (pageResult <= 0) {
                        return interaction.createMessage({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(this.client.config.BOT.COLOUR)
                                    .setDescription(
                                        this.client.translate(
                                            "main.result.enter.unknown",
                                            {
                                                index: pageResult.toLocaleString(),
                                            }
                                        )
                                    )
                                    .toJSON(),
                            ],
                            flags: Constants.MessageFlags.EPHEMERAL,
                        });
                    }

                    this.embed = pageResult;
                    this.updatePaginator();
                    interaction.deferUpdate();
                    break;
                case `jumpto_result_page_modal_${this.interaction.id}`:
                    /* eslint-disable-next-line */
                    const page = parseInt(
                        Util.getModalID(interaction, "result_page_number")
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

                    if (page > this.search.pages) {
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

                    this.api.search(this.search.query, page).then((search) => {
                        const title = search.books.map(
                            (gallery, index) =>
                                `\`⬛ ${
                                    (index + 1).toString().length > 1
                                        ? `${index + 1}`
                                        : `${index + 1} `
                                }\` - [\`${
                                    gallery.id
                                }\`](https://nhentai.net/g/${gallery.id}) - \`${
                                    gallery.title.pretty.length >= 30
                                        ? `${gallery.title.pretty.slice(
                                              0,
                                              30
                                          )}...`
                                        : gallery.title.pretty
                                }\``
                        );
                        const embeds = search.books.map((gallery, index) => {
                            const artistTags: string[] = gallery.artists.map(
                                (tag) => tag.name
                            );
                            const characterTags: string[] =
                                gallery.characters.map((tag) => tag.name);
                            const contentTags: string[] = gallery.pureTags.map(
                                (tag) =>
                                    `${
                                        tag.name
                                    } (${tag.count.toLocaleString()})`
                            );
                            const languageTags: string[] =
                                gallery.languages.map(
                                    (tag) =>
                                        tag.name.charAt(0).toUpperCase() +
                                        tag.name.slice(1)
                                );
                            const parodyTags: string[] = gallery.parodies.map(
                                (tag) => tag.name
                            );
                            const uploadedAt = `<t:${
                                gallery.uploaded.getTime() / 1000
                            }:F>`;
                            const stringTag =
                                contentTags.join("`, `").length >= 1024
                                    ? `${contentTags
                                          .join("`, `")
                                          .slice(0, 1010)}...`
                                    : contentTags.join("`, `");

                            return new EmbedBuilder()
                                .setAuthor(
                                    gallery.id.toString(),
                                    undefined,
                                    `https://nhentai.net/g/${gallery.id}`
                                )
                                .setColor(this.client.config.BOT.COLOUR)
                                .setDescription(
                                    title
                                        .join("\n")
                                        .replace(
                                            `\`⬛ ${
                                                (index + 1).toString().length >
                                                1
                                                    ? `${index + 1}`
                                                    : `${index + 1} `
                                            }\` - [\`${
                                                gallery.id
                                            }\`](https://nhentai.net/g/${
                                                gallery.id
                                            }) - \`${
                                                gallery.title.pretty.length >=
                                                30
                                                    ? `${gallery.title.pretty.slice(
                                                          0,
                                                          30
                                                      )}...`
                                                    : gallery.title.pretty
                                            }\``,
                                            `**\`🟥 ${
                                                (index + 1).toString().length >
                                                1
                                                    ? `${index + 1}`
                                                    : `${index + 1} `
                                            }\` - [\`${
                                                gallery.id
                                            }\`](https://nhentai.net/g/${
                                                gallery.id
                                            }) - \`${
                                                gallery.title.pretty.length >=
                                                30
                                                    ? `${gallery.title.pretty.slice(
                                                          0,
                                                          30
                                                      )}...`
                                                    : gallery.title.pretty
                                            }\`**`
                                        )
                                )
                                .setFooter(
                                    `⭐ ${gallery.favorites.toLocaleString()}`
                                )
                                .setTitle(
                                    this.client.translate("main.page", {
                                        firstIndex:
                                            search.page.toLocaleString(),
                                        lastIndex:
                                            search.pages.toLocaleString(),
                                    })
                                )
                                .setThumbnail(
                                    this.client.api.getImageURL(gallery.cover)
                                )
                                .addField(
                                    this.client.translate("main.title"),
                                    `\`${gallery.title.pretty}\``
                                )
                                .addField(
                                    this.client.translate("main.pages"),
                                    `\`${gallery.pages.length}\``
                                )
                                .addField(
                                    this.client.translate("main.released"),
                                    uploadedAt
                                )
                                .addField(
                                    languageTags.length > 1
                                        ? this.client.translate(
                                              "main.languages"
                                          )
                                        : this.client.translate(
                                              "main.language"
                                          ),
                                    `\`${
                                        languageTags.length !== 0
                                            ? languageTags.join("`, `")
                                            : this.client.translate("main.none")
                                    }\``
                                )
                                .addField(
                                    artistTags.length > 1
                                        ? this.client.translate("main.artists")
                                        : this.client.translate("main.artist"),
                                    `\`${
                                        artistTags.length !== 0
                                            ? artistTags.join("`, `")
                                            : this.client.translate("main.none")
                                    }\``
                                )
                                .addField(
                                    characterTags.length > 1
                                        ? this.client.translate(
                                              "main.characters"
                                          )
                                        : this.client.translate(
                                              "main.character"
                                          ),
                                    `\`${
                                        characterTags.length !== 0
                                            ? characterTags.join("`, `")
                                            : this.client.translate(
                                                  "main.original"
                                              )
                                    }\``
                                )
                                .addField(
                                    parodyTags.length > 1
                                        ? this.client.translate("main.parodies")
                                        : this.client.translate("main.parody"),
                                    `\`${
                                        parodyTags.length !== 0
                                            ? parodyTags
                                                  .join("`, `")
                                                  .replace(
                                                      "original",
                                                      `${this.client.translate(
                                                          "main.original"
                                                      )}`
                                                  )
                                            : this.client.translate("main.none")
                                    }\``
                                )
                                .addField(
                                    contentTags.length > 1
                                        ? this.client.translate("main.tags")
                                        : this.client.translate("main.tag"),
                                    `\`${
                                        contentTags.length !== 0
                                            ? stringTag
                                            : this.client.translate("main.none")
                                    }\``
                                );
                        });

                        this.search = search;
                        this.embeds = embeds.map((embed) => embed.toJSON());
                        this.embed = 1;
                        this.updatePaginator();
                    });

                    interaction.deferUpdate();
                    break;
            }
        }
    }

    /**
     * Run the paginator class
     */
    public runPaginator() {
        this.client.on("interactionCreate", this.onSearch);
        this.running = true;

        setTimeout(() => {
            this.client.off("interactionCreate", this.onSearch);
        }, 7200 * 1000);
    }

    /**
     * Stop the paginator class
     */
    public stopPaginator() {
        this.client.off("interactionCreate", this.onSearch);
        this.running = false;
    }

    /**
     * Update the paginator class
     */
    public updatePaginator() {
        const components = new ComponentBuilder<MessageActionRow>()
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `first_result_${this.interaction.id}`,
                "<<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `previous_result_${this.interaction.id}`,
                "<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `jumpto_result_${this.interaction.id}`,
                `${this.embed.toLocaleString()} / ${this.embeds.length.toLocaleString()}`
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `next_result_${this.interaction.id}`,
                ">"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `last_result_${this.interaction.id}`,
                ">>"
            )
            .addRow()
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `first_result_page_${this.interaction.id}`,
                "<<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `previous_result_page_${this.interaction.id}`,
                "<"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `jumpto_result_page_${this.interaction.id}`,
                `${this.search.page.toLocaleString()} / ${this.search.pages.toLocaleString()}`
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `next_result_page_${this.interaction.id}`,
                ">"
            )
            .addInteractionButton(
                Constants.ButtonStyles.SECONDARY,
                `last_result_page_${this.interaction.id}`,
                ">>"
            )
            .addRow()
            .addInteractionButton(
                Constants.ButtonStyles.PRIMARY,
                `read_result_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "📖",
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
                `stop_result_${this.interaction.id}`,
                undefined,
                {
                    id: undefined,
                    name: "🗑",
                }
            )
            .addInteractionButton(
                Constants.ButtonStyles.PRIMARY,
                `show_cover_${this.interaction.id}`,
                this.client.translate("main.cover.show")
            )
            .toJSON();

        this.client.stats.logActivities(
            this.interaction.user.id,
            "search-paginator",
            decodeURIComponent(this.search.query),
            this.search.page,
            this.embed,
            this.embeds[this.embed - 1].author.name
        );

        this.message.edit({
            components,
            embeds: [this.embeds[this.embed - 1]],
        });
    }
}

export async function createSearchPaginator(
    client: NReaderClient,
    search: Search,
    interaction: CommandInteraction<TextChannel>
) {
    const paginator = new SearchPaginator(client, search, interaction);

    paginator.runPaginator();

    return Promise.resolve(paginator.message);
}
