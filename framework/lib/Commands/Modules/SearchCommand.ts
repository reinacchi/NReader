import { Constant } from "../../API";
import { NReaderClient } from "../../Client";
import {
    MessageActionRow,
    CommandInteraction,
    Constants,
    TextChannel,
} from "oceanic.js";
import { ComponentBuilder, EmbedBuilder } from "@oceanicjs/builders";
import { createSearchPaginator } from "../../Modules/SearchPaginator";
import { setTimeout } from "node:timers/promises";
import { NReaderConstant } from "../../Constant";

export async function searchCommand(
    client: NReaderClient,
    interaction: CommandInteraction<TextChannel>
) {
    const page = interaction.data.options.getInteger("page");
    const query = interaction.data.options.getString("query");
    const sort =
        interaction.data.options.getString<Constant.TSearchSort>("sort");

    client.stats.updateUserHistory(
        interaction.user.id,
        "searched",
        query,
        "search"
    );

    client.stats.logActivities(interaction.user.id, "search", query);

    await interaction.defer();
    await setTimeout(2000);

    client.api
        .search(encodeURIComponent(query), page || 1, sort || "")
        .then(async (search) => {
            if (search.books.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(client.config.BOT.COLOUR)
                    .setDescription(
                        client.translate("main.search.none", { query: query })
                    );

                return interaction.createFollowup({
                    embeds: [embed.toJSON()],
                });
            }

            const title = search.books.map(
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

            const embed = new EmbedBuilder()
                .setColor(client.config.BOT.COLOUR)
                .setDescription(title.join("\n"))
                .setTitle(
                    client.translate("main.page", {
                        firstIndex: search.page,
                        lastIndex: search.pages.toLocaleString(),
                    })
                );

            const components = new ComponentBuilder<MessageActionRow>()
                .addInteractionButton(
                    Constants.ButtonStyles.PRIMARY,
                    `see_more_${interaction.id}`,
                    client.translate("main.detail")
                )
                .addInteractionButton(
                    Constants.ButtonStyles.DANGER,
                    `stop_result_${interaction.id}`,
                    undefined,
                    {
                        id: undefined,
                        name: "🗑",
                    }
                )
                .toJSON();

            createSearchPaginator(client, search, interaction);
            interaction.createFollowup({
                components: components,
                embeds: [embed.toJSON()],
            });
        })
        .catch((err: Error) => {
            if (err) {
                const embed = new EmbedBuilder()
                    .setColor(client.config.BOT.COLOUR)
                    .setDescription(
                        client.translate("main.invalid", {
                            result: NReaderConstant.Source.SEARCH(
                                encodeURIComponent(query)
                            ),
                        })
                    );

                interaction.createFollowup({
                    embeds: [embed.toJSON()],
                });
            }

            return client.logger.error({
                message: err.message,
                subTitle: "NHentaiAPI::Search",
                title: "API",
            });
        });
}
