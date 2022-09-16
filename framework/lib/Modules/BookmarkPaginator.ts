import { RequestHandler, Gallery } from "../API";
import { CommandInteraction, ComponentInteraction, Constants, EmbedOptions, InteractionContent, Member, MessageActionRow, Message, ModalSubmitInteraction, TextChannel } from "oceanic.js";
import { NReaderClient } from "../Client";
import { RichEmbed } from "../Utils/RichEmbed";
import { UserModel } from "../Models";
import { ReadSearchPaginator } from "./ReadSearchPaginator";
import { NReaderConstant } from "../Constant";
import { Util } from "../Utils";

export class BookmarkPaginator {
    /**
     * NHentai API
     */
    api: RequestHandler;

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
     * Bookmarked doujin
     */
    galleries: Gallery[];

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
     * The user who owned the bookmark
     */
    user: Member;

    /**
     * Creates a read paginator
     * @param client NReader client
     * @param galleries Current galleries
     * @param interaction Oceanic command interaction
     */
    constructor(client: NReaderClient, galleries: Gallery[], interaction: CommandInteraction<TextChannel>, user: Member) {
        this.api = client.api;
        this.client = client;
        this.embed = 1;
        this.embeds = [];
        this.galleries = galleries;
        this.interaction = interaction;
        this.onSearch = this.onSearch.bind(this);
        this.running = false;
        this.user = user;
    }

    /**
     * Initialise the paginator class
     */
    public async initialisePaginator() {
        const title = this.galleries.map((gallery, index) => `\`⬛ ${(index + 1).toString().length > 1 ? `${index + 1}` : `${index + 1} `}\` - [\`${gallery.id}\`](${gallery.url}) - \`${gallery.title.pretty}\``);
        const embeds = this.galleries.map((gallery, index) => {
            const artistTags: string[] = gallery.tags.artists.map((tag) => tag.name);
            const characterTags: string[] = gallery.tags.characters.map((tag) => tag.name);
            const contentTags: string[] = gallery.tags.tags.map((tag) => `${tag.name} (${tag.count.toLocaleString()})`);
            const languageTags: string[] = gallery.tags.languages.map((tag) => tag.name.charAt(0).toUpperCase() + tag.name.slice(1));
            const parodyTags: string[] = gallery.tags.parodies.map((tag) => tag.name);
            const uploadedAt = `<t:${gallery.uploadDate.getTime() / 1000}:F>`;

            return new RichEmbed()
                .setAuthor(gallery.id, gallery.url)
                .setColor(this.client.config.BOT.COLOUR)
                .setDescription(title.join("\n").replace(`\`⬛ ${(index + 1).toString().length > 1 ? `${index + 1}` : `${index + 1} `}\` - [\`${gallery.id}\`](${gallery.url}) - \`${gallery.title.pretty}\``, `**\`🟥 ${(index + 1).toString().length > 1 ? `${index + 1}` : `${index + 1} `}\` - [\`${gallery.id}\`](${gallery.url}) - \`${gallery.title.pretty}\`**`))
                .setFooter(`⭐ ${gallery.favourites.toLocaleString()}`)
                .setTitle(this.client.translate("main.bookmark.title", { user: this.user.username }))
                .setThumbnail(gallery.cover.url)
                .addField(this.client.translate("main.title"), `\`${gallery.title.pretty}\``)
                .addField(this.client.translate("main.pages"), `\`${gallery.pages.length}\``)
                .addField(this.client.translate("main.released"), uploadedAt)
                .addField(languageTags.length > 1 ? this.client.translate("main.languages") : this.client.translate("main.language"), `\`${languageTags.length !== 0 ? languageTags.join("`, `") : this.client.translate("main.none")}\``)
                .addField(artistTags.length > 1 ? this.client.translate("main.artists") : this.client.translate("main.artist"), `\`${artistTags.length !== 0 ? artistTags.join("`, `") : this.client.translate("main.none")}\``)
                .addField(characterTags.length > 1 ? this.client.translate("main.characters") : this.client.translate("main.character"), `\`${characterTags.length !== 0 ? characterTags.join("`, `") : this.client.translate("main.original")}\``)
                .addField(parodyTags.length > 1 ? this.client.translate("main.parodies") : this.client.translate("main.parody"), `\`${parodyTags.length !== 0 ? parodyTags.join("`, `").replace("original", `${this.client.translate("main.original")}`) : this.client.translate("main.none")}\``)
                .addField(contentTags.length > 1 ? this.client.translate("main.tags") : this.client.translate("main.tag"), `\`${contentTags.length !== 0 ? contentTags.join("`, `") : this.client.translate("main.none")}\``);
        });

        this.embeds = embeds.map((embed) => embed.data);

        const messageContent: InteractionContent = {
            components: [
                {
                    components: [
                        { customID: `first_result_${this.interaction.id}`, label: this.client.translate("main.result.first"), style: 1, type: 2 },
                        { customID: `previous_result_${this.interaction.id}`, label: this.client.translate("main.result.previous"), style: 2, type: 2 },
                        { customID: `stop_result_${this.interaction.id}`, label: this.client.translate("main.stop"), style: 4, type: 2 },
                        { customID: `next_result_${this.interaction.id}`, label: this.client.translate("main.result.next"), style: 2, type: 2 },
                        { customID: `last_result_${this.interaction.id}`, label: this.client.translate("main.result.last"), style: 1, type: 2 },
                    ],
                    type: 1
                },
                {
                    components: [
                        { customID: `jumpto_result_${this.interaction.id}`, label: this.client.translate("main.result.enter"), style: 1, type: 2 },
                    ],
                    type: 1
                },
                {
                    components: [
                        { customID: `read_result_${this.interaction.id}`, label: this.client.translate("main.read"), style: 3, type: 2 },
                        { customID: `bookmark_${this.interaction.id}`, label: this.client.translate("main.bookmark"), style: 2, type: 2 },
                        { customID: `show_cover_${this.interaction.id}`, label: this.client.translate("main.cover.show"), style: 1, type: 2 }
                    ],
                    type: 1
                }
            ],
            embeds: [this.embeds[this.embed - 1]]
        };

        this.message = await this.interaction.editOriginal(messageContent);
        this.updatePaginator();
    }

    /**
     * Start searching
     * @param interaction Eris component interaction
     */
    public async onSearch(interaction: ComponentInteraction<TextChannel> | ModalSubmitInteraction<TextChannel>) {
        if (interaction.member.bot) return;

        const embed = new RichEmbed((interaction as ComponentInteraction).message ? (interaction as ComponentInteraction).message.embeds[0] : undefined);
        const userData = await UserModel.findOne({ id: interaction.member.id });

        const hideComponent: MessageActionRow[] = [
            {
                components: [
                    { customID: `first_result_${this.interaction.id}`, label: this.client.translate("main.result.first"), style: 1, type: 2 },
                    { customID: `previous_result_${this.interaction.id}`, label: this.client.translate("main.result.previous"), style: 2, type: 2 },
                    { customID: `stop_result_${this.interaction.id}`, label: this.client.translate("main.stop"), style: 4, type: 2 },
                    { customID: `next_result_${this.interaction.id}`, label: this.client.translate("main.result.next"), style: 2, type: 2 },
                    { customID: `last_result_${this.interaction.id}`, label: this.client.translate("main.result.last"), style: 1, type: 2 },
                ],
                type: 1
            },
            {
                components: [
                    { customID: `jumpto_result_${this.interaction.id}`, label: this.client.translate("main.result.enter"), style: 1, type: 2 },
                ],
                type: 1
            },
            {
                components: [
                    { customID: `read_result_${this.interaction.id}`, label: this.client.translate("main.read"), style: 3, type: 2 },
                    { customID: `bookmark_${this.interaction.id}`, label: this.client.translate("main.bookmark"), style: 2, type: 2 },
                    { customID: `hide_cover_${this.interaction.id}`, label: this.client.translate("main.cover.hide"), style: 1, type: 2 }
                ],
                type: 1
            }
        ];

        const showComponent: MessageActionRow[] = [
            {
                components: [
                    { customID: `first_result_${this.interaction.id}`, label: this.client.translate("main.result.first"), style: 1, type: 2 },
                    { customID: `previous_result_${this.interaction.id}`, label: this.client.translate("main.result.previous"), style: 2, type: 2 },
                    { customID: `stop_result_${this.interaction.id}`, label: this.client.translate("main.stop"), style: 4, type: 2 },
                    { customID: `next_result_${this.interaction.id}`, label: this.client.translate("main.result.next"), style: 2, type: 2 },
                    { customID: `last_result_${this.interaction.id}`, label: this.client.translate("main.result.last"), style: 1, type: 2 },
                ],
                type: 1
            },
            {
                components: [
                    { customID: `jumpto_result_${this.interaction.id}`, label: this.client.translate("main.result.enter"), style: 1, type: 2 },
                ],
                type: 1
            },
            {
                components: [
                    { customID: `read_result_${this.interaction.id}`, label: this.client.translate("main.read"), style: 3, type: 2 },
                    { customID: `bookmark_${this.interaction.id}`, label: this.client.translate("main.bookmark"), style: 2, type: 2 },
                    { customID: `show_cover_${this.interaction.id}`, label: this.client.translate("main.cover.show"), style: 1, type: 2 }
                ],
                type: 1
            }
        ];

        if (interaction instanceof ComponentInteraction) {
            switch (interaction.data.customID) {
                case `read_result_${this.interaction.id}`:
                    interaction.deferUpdate();

                    this.api.getGallery(embed.author.name).then(async (gallery) => {
                        this.paginationEmbed = new ReadSearchPaginator(this.client, gallery, this.interaction);
                        await this.paginationEmbed.initialisePaginator();
                        this.paginationEmbed.runPaginator();
                    });

                    break;
                case `see_more_${this.interaction.id}`:
                    interaction.deferUpdate();
                    this.initialisePaginator();
                    break;
                case `show_cover_${this.interaction.id}`:
                    embed.setImage((await this.api.getGallery(embed.author.name)).cover.url);
                    this.interaction.editOriginal({ components: hideComponent, embeds: [embed.data] });
                    interaction.deferUpdate();
                    break;
                case `hide_cover_${this.interaction.id}`:
                    embed.setImage("");
                    this.interaction.editOriginal({ components: showComponent, embeds: [embed.data] });
                    interaction.deferUpdate();
                    break;
                case `home_result_${this.interaction.id}`:
                    this.interaction.editOriginal({ components: showComponent, embeds: [this.embeds[this.embed - 1]] });
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

                    if (userData.bookmark.includes(embed.author.name)) {
                        interaction.createMessage({
                            embeds: [
                                new RichEmbed()
                                    .setColor(this.client.config.BOT.COLOUR)
                                    .setDescription(this.client.translate("main.bookmark.removed", { id: `[\`${embed.author.name}\`](${NReaderConstant.Source.ID(embed.author.name)})` })).data
                            ],
                            flags: Constants.MessageFlags.EPHEMERAL
                        });

                        UserModel.findOneAndUpdate({ id: interaction.member.id }, { $pull: { "bookmark": embed.author.name } }).exec();
                    } else {
                        if (userData.bookmark.length === 25) {
                            return interaction.createMessage({
                                embeds: [
                                    new RichEmbed()
                                        .setColor(this.client.config.BOT.COLOUR)
                                        .setDescription(this.client.translate("main.bookmark.maxed")).data
                                ],
                                flags: Constants.MessageFlags.EPHEMERAL
                            });
                        }

                        interaction.createMessage({
                            embeds: [
                                new RichEmbed()
                                    .setColor(this.client.config.BOT.COLOUR)
                                    .setDescription(this.client.translate("main.bookmark.saved", { id: `[\`${embed.author.name}\`](${NReaderConstant.Source.ID(embed.author.name)})` })).data
                            ],
                            flags: Constants.MessageFlags.EPHEMERAL
                        });

                        UserModel.findOneAndUpdate({ id: interaction.member.id }, { $push: { "bookmark": embed.author.name } }).exec();
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
                        components: [
                            {
                                components: [
                                    {
                                        customID: "result_number",
                                        label: this.client.translate("main.result.enter"),
                                        placeholder: "10",
                                        required: true,
                                        style: 1,
                                        type: 4
                                    }
                                ],
                                type: 1
                            }
                        ],
                        customID: `jumpto_result_modal_${this.interaction.id}`,
                        title: this.client.translate("main.result.enter")
                    });

                    break;
            }
        } else {
            switch (interaction.data.customID) {
                case `jumpto_result_modal_${this.interaction.id}`:
                    /* eslint-disable-next-line */
                    const page = parseInt(Util.getModalID(interaction, "result_number"));

                    if (isNaN(page)) {
                        return interaction.createMessage({
                            embeds: [
                                new RichEmbed()
                                    .setColor(this.client.config.BOT.COLOUR)
                                    .setDescription(this.client.translate("main.result.enter.invalid")).data
                            ],
                            flags: Constants.MessageFlags.EPHEMERAL
                        });
                    }

                    if (page > this.embeds.length) {
                        return interaction.createMessage({
                            embeds: [
                                new RichEmbed()
                                    .setColor(this.client.config.BOT.COLOUR)
                                    .setDescription(this.client.translate("main.result.enter.unknown", { index: page.toLocaleString() })).data
                            ],
                            flags: Constants.MessageFlags.EPHEMERAL
                        });
                    }

                    if (page <= 0) {
                        return interaction.createMessage({
                            embeds: [
                                new RichEmbed()
                                    .setColor(this.client.config.BOT.COLOUR)
                                    .setDescription(this.client.translate("main.result.enter.unknown", { index: page.toLocaleString() })).data
                            ],
                            flags: Constants.MessageFlags.EPHEMERAL
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
     * Update the paginator class
     */
    public updatePaginator() {
        this.message.edit({
            components: [
                {
                    components: [
                        { customID: `first_result_${this.interaction.id}`, label: this.client.translate("main.result.first"), style: 1, type: 2 },
                        { customID: `previous_result_${this.interaction.id}`, label: this.client.translate("main.result.previous"), style: 2, type: 2 },
                        { customID: `stop_result_${this.interaction.id}`, label: this.client.translate("main.stop"), style: 4, type: 2 },
                        { customID: `next_result_${this.interaction.id}`, label: this.client.translate("main.result.next"), style: 2, type: 2 },
                        { customID: `last_result_${this.interaction.id}`, label: this.client.translate("main.result.last"), style: 1, type: 2 },
                    ],
                    type: 1
                },
                {
                    components: [
                        { customID: `jumpto_result_${this.interaction.id}`, label: this.client.translate("main.result.enter"), style: 1, type: 2 },
                    ],
                    type: 1
                },
                {
                    components: [
                        { customID: `read_result_${this.interaction.id}`, label: this.client.translate("main.read"), style: 3, type: 2 },
                        { customID: `bookmark_${this.interaction.id}`, label: this.client.translate("main.bookmark"), style: 2, type: 2 },
                        { customID: `show_cover_${this.interaction.id}`, label: this.client.translate("main.cover.show"), style: 1, type: 2 }
                    ],
                    type: 1
                }
            ],
            embeds: [this.embeds[this.embed - 1]]
        });
    }

    /**
     * Run the paginator class
     */
    public runPaginator() {
        this.client.on("interactionCreate", this.onSearch);
        this.running = true;
    }

    /**
     * Stop the paginator class
     */
    public stopPaginator() {
        this.client.off("interactionCreate", this.onSearch);
        this.running = false;
    }
}

export async function createBookmarkPaginator(client: NReaderClient, galleries: Gallery[], interaction: CommandInteraction<TextChannel>, user: Member) {
    const paginator = new BookmarkPaginator(client, galleries, interaction, user);

    paginator.runPaginator();

    return Promise.resolve(paginator.message);
}
